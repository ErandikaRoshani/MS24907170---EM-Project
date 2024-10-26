import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  PermissionsAndroid,
  TouchableOpacity,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {useProgressContext} from '../components/ProgressContext';
import ProgressBar from 'react-native-progress/Bar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {auth, db} from '../../firebaseConfig';
import {doc, getDoc, updateDoc} from 'firebase/firestore';
import GemCounter from '../components/GemCounter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const ChallengeScreen = () => {
  const {level, setLevel, gems, setGems, challenges, setChallenges} =
    useProgressContext();
  const [watchId, setWatchId] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const stepsPerMile = 2000;
  const metersPerMile = 1609.34;

  useEffect(() => {
    // Check the initial connection status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Request location permission and watch GPS position
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to track steps.',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Location permission granted');

          const id = Geolocation.watchPosition(
            position => {
              if (lastPosition) {
                const distance = calculateDistance(
                  lastPosition,
                  position.coords,
                );
                const steps = convertDistanceToSteps(distance);

                // Update GPS steps for the current challenge
                setChallenges(prevChallenges => {
                  const updatedChallenges = [...prevChallenges];
                  if (!updatedChallenges[level - 1].completed) {
                    updatedChallenges[level - 1].gpsSteps += steps;
                    updatedChallenges[level - 1].totalSteps =
                      updatedChallenges[level - 1].gpsSteps +
                      updatedChallenges[level - 1].manualSteps;

                    // Update Firestore with new GPS steps
                    updateUserChallengeProgress(updatedChallenges, gems);
                  }
                  return updatedChallenges;
                });
              }
              setLastPosition(position.coords);
            },
            error => {
              console.error(error);
              Alert.alert(
                'Error',
                'Unable to access GPS. Please check your settings.',
              );
            },
            {
              enableHighAccuracy: true,
              distanceFilter: 1,
              interval: 10000,
              fastestInterval: 5000,
            },
          );

          setWatchId(id);
        } else {
          Alert.alert(
            'Permission denied',
            'Please enable location permissions in settings.',
          );
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };

    requestLocationPermission();

    return () => {
      if (watchId) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, [gems, lastPosition, level]);

  const calculateDistance = (lastPosition, currentPosition) => {
    const {latitude: lat1, longitude: lon1} = lastPosition;
    const {latitude: lat2, longitude: lon2} = currentPosition;

    const R = 6371000; // Radius of the Earth in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    return distance;
  };

  const convertDistanceToSteps = distance => {
    const miles = distance / metersPerMile;
    const steps = miles * stepsPerMile;
    return Math.round(steps);
  };

  const updateUserChallengeProgress = useCallback(
    async (updatedChallenges, updatedGems, level) => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            challenges: updatedChallenges,
            gems: updatedGems,
            level: level,
          });
        }
      } catch (error) {
        console.error('Error updating challenge progress:', error);
      }
    },
    [level],
  );

  const handleCompleteChallenge = () => {
    const currentChallengeIndex = level - 1;
    const currentChallenge = challenges[currentChallengeIndex];

    if (currentChallenge.totalSteps >= currentChallenge.targetSteps) {
      const newGems = gems + currentChallenge.rewardGems;
      setGems(newGems);

      setChallenges(prevChallenges => {
        const updatedChallenges = [...prevChallenges];
        updatedChallenges[currentChallengeIndex].completed = true;
        updatedChallenges[currentChallengeIndex].completedSteps =
          currentChallenge.totalSteps;

        if (level < challenges.length) {
          updatedChallenges[level].isUnlocked = true;
        }

        updateUserChallengeProgress(updatedChallenges, newGems, level).then();

        return updatedChallenges;
      });

      if (level < challenges.length) {
        setLevel(prevLevel => prevLevel + 1);
      } else {
        Alert.alert('Congratulations!', 'You have completed all challenges!');
      }
    } else {
      Alert.alert('Not enough steps to complete the challenge!');
    }
  };

  const renderChallenge = challenge => {
    // Check if the challenge is unlocked and not completed
    const showManualStepsInput = challenge.isUnlocked && !challenge.completed;

    return (
      <View
        key={challenge.level}
        style={[
          styles.challengeContainer,
          challenge.completed && styles.completedChallenge,
        ]}>
        <View style={styles.headerContainer}>
          <Text style={styles.levelText}>Level {challenge.level}</Text>
          <View style={styles.rewardContainer}>
            <Icon name="diamond" size={20} color="#ffc107" />
            <Text style={styles.rewardText}>{challenge.rewardGems} gems</Text>
          </View>
        </View>

        {challenge.isUnlocked ? (
          <>
            <Text style={styles.targetText}>
              Target: {challenge.targetSteps} steps
            </Text>
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={challenge.totalSteps / challenge.targetSteps}
                width={null}
                color="#28a745"
                height={12}
                borderRadius={8}
                unfilledColor="#e0e0e0"
              />
            </View>
            <View style={styles.stepsInfo}>
              <Icon name="run" size={20} color="#007BFF" />
              <Text style={styles.stepsText}>
                Total Steps: {challenge.totalSteps}
              </Text>
            </View>
            <View style={styles.stepsInfo}>
              <Icon name="map-marker" size={20} color="#007BFF" />
              <Text style={styles.stepsText}>
                GPS Steps: {challenge.gpsSteps}
              </Text>
            </View>
            <View style={styles.stepsInfo}>
              <Icon name="pencil" size={20} color="#007BFF" />
              <Text style={styles.stepsText}>
                Manual Steps: {challenge.manualSteps}
              </Text>
            </View>

            {showManualStepsInput && (
              <>
                <TextInput
                  placeholder="Enter manual steps"
                  keyboardType="numeric"
                  style={styles.input}
                  onSubmitEditing={event => {
                    const manualSteps = parseInt(event.nativeEvent.text, 10);
                    if (!isNaN(manualSteps) && manualSteps > 0) {
                      setChallenges(prevChallenges => {
                        const updatedChallenges = [...prevChallenges];
                        const currentChallengeIndex = level - 1;
                        // Add the new manual steps to existing ones
                        updatedChallenges[currentChallengeIndex].manualSteps +=
                          manualSteps;
                        updatedChallenges[currentChallengeIndex].totalSteps =
                          updatedChallenges[currentChallengeIndex].gpsSteps +
                          updatedChallenges[currentChallengeIndex].manualSteps;
                        const currentChallenge =
                          updatedChallenges[currentChallengeIndex];

                        updateUserChallengeProgress(
                          updatedChallenges,
                          gems,
                          level,
                        ).then();

                        return updatedChallenges;
                      });
                    } else {
                      Alert.alert(
                        'Invalid input',
                        'Please enter a valid number of steps.',
                      );
                    }
                  }}
                />

                <TouchableOpacity
                  onPress={handleCompleteChallenge}
                  style={styles.button}>
                  <Text style={styles.buttonText}>Complete Challenge</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={styles.lockedContainer}>
            <View style={styles.lockedChallenge}>
              <Icon name="lock" size={30} color="#d9534f" />
              <Text style={styles.lockedText}> Locked</Text>
            </View>
            <Text style={styles.lockedDescription}>
              Unlock by completing the previous challenge.
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Challenge Screen</Text>
      <GemCounter gems={gems} />
      {challenges?.map(challenge => renderChallenge(challenge))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  challengeContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  completedChallenge: {
    backgroundColor: '#d4edda',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    marginLeft: 4,
    fontSize: 16,
  },
  targetText: {
    marginVertical: 8,
    fontSize: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  stepsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepsText: {
    marginLeft: 8,
    fontSize: 16,
  },
  input: {
    height: 40,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    borderRadius: 4,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  lockedContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginVertical: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#e9ecef',
  },
  lockedChallenge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
    marginLeft: 5,
  },
  lockedDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  gemsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 50,
    textAlign: 'center',
  },
});

export default ChallengeScreen;
