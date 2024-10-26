import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {auth, db} from '../../firebaseConfig';
import {doc, getDoc} from 'firebase/firestore';
import {signOut} from 'firebase/auth';
import BadgeComponent from '../components/Badge';
import {badges} from '../data/BadgeData';

const UserProfile = ({navigation}) => {
  const [userData, setUserData] = useState(null);
  const [userBadges, setUserBadges] = useState(badges);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = auth.currentUser.uid;
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          unlockBadges(data);
        } else {
          console.log('No such user!');
        }
      } catch (error) {
        console.error('Error fetching user data: ', error);
      }
    };

    fetchUserData();
  }, []);

  const unlockBadges = data => {
    const completedChallengesCount = data.challenges.filter(
      challenge => challenge.completed,
    ).length;

    const updatedBadges = userBadges.map(badge => {
      let earned = badge.earned;
      if (badge.criteria.gems && data.gems >= badge.criteria.gems) {
        earned = true;
      }
      if (badge.criteria.steps && data.totalSteps >= badge.criteria.steps) {
        earned = true;
      }
      if (
        badge.criteria.completedChallenges &&
        completedChallengesCount >= badge.criteria.completedChallenges
      ) {
        earned = true;
      }

      return {...badge, earned};
    });

    setUserBadges(updatedBadges);
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigation.replace('Login');
      })
      .catch(error => {
        Alert.alert('Logout Failed', error.message);
      });
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#155724" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>My Profile</Text>
      <View style={styles.profileCard}>
        <View style={styles.profileIconContainer}>
          <Icon name="account" size={100} color={'#fff'} />
        </View>
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>{userData.name}</Text>
          <View style={styles.infoRow}>
            <Icon name="email" size={20} color="#155724" />
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color="#155724" />
            <Text style={styles.userContact}>{userData.contactNo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="diamond" size={20} color="#155724" />
            <Text style={styles.userGems}>Gems: {userData.gems}</Text>
          </View>
        </View>
      </View>
      <View style={styles.badgesSection}>
        <Text style={styles.badgesHeader}>Your Badges</Text>
        <View style={styles.badgesContainer}>
          {userBadges.map(badge => (
            <BadgeComponent key={badge.id} badge={badge} />
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 20,
  },
  profileCard: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#d4edda',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
  },
  profileIconContainer: {
    marginBottom: 20,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#155724',
    padding: 10,
  },
  userInfoContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    width: '100%',
  },
  userName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#155724',
    marginLeft: 10,
  },
  userContact: {
    fontSize: 16,
    color: '#155724',
    marginLeft: 10,
  },
  userGems: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginLeft: 10,
  },
  badgesSection: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  badgesHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#155724',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UserProfile;
