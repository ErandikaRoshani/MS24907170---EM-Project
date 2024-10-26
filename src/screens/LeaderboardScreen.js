import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {auth, db} from '../../firebaseConfig';
import {collection, getDocs} from 'firebase/firestore';
import {useProgressContext} from '../components/ProgressContext';
import Icon from 'react-native-vector-icons/FontAwesome';

const LeaderboardScreen = () => {
  const {level, gems} = useProgressContext();
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const sortedData = usersData.sort((a, b) => b.gems - a.gems);
        setLeaderboardData(sortedData);
      } catch (error) {
        console.error('Error fetching leaderboard data: ', error);
      }
    };

    fetchLeaderboardData().then();
  }, []);

  const renderItem = ({item}) => {
    const isCurrentUser = item.id === auth.currentUser.uid;

    return (
      <View style={[styles.item, isCurrentUser && styles.currentUser]}>
        <View style={styles.userInfo}>
          <Icon
            name="user"
            size={24}
            color={isCurrentUser ? '#155724' : '#6c757d'}
            style={styles.icon}
          />
          <Text style={[styles.name, isCurrentUser && styles.currentUserName]}>
            {item.username}
          </Text>
        </View>
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Icon name="star" size={16} color="#ffc107" />
            <Text style={styles.level}>Level: {item.level}</Text>
          </View>
          <View style={styles.detailItem}>
            <Icon name="diamond" size={16} color="#6c757d" />
            <Text style={styles.gems}>Gems: {item.gems}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      <FlatList
        data={leaderboardData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{paddingBottom: 20}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#343a40',
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    elevation: 2,
  },
  currentUser: {
    backgroundColor: '#d4edda',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  currentUserName: {
    fontWeight: 'bold',
    color: '#155724',
  },
  name: {
    fontSize: 18,
    color: '#212529',
  },
  level: {
    fontSize: 16,
    color: '#495057',
    marginLeft: 5,
  },
  gems: {
    fontSize: 16,
    color: '#6c757d',
    marginLeft: 5,
  },
});

export default LeaderboardScreen;
