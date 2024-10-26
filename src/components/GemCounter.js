import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const GemCounter = ({gems}) => {
  const [animatedValue] = useState(new Animated.Value(1));
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [gems]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.iconContainer, {transform: [{scale: animatedValue}]}]}>
        <Icon name="diamond" size={40} color="#ffc107" />
      </Animated.View>
      <Text style={styles.gemCount}>{gems}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  iconContainer: {
    marginRight: 10,
  },
  gemCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default GemCounter;
