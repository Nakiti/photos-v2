
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { TouchableOpacity, Image, Text, View, StyleSheet } from "react-native";

const UserInfoCard = ({onDismiss, profilePicture, name, handle, bio, groups}) => {
    const translateY = useSharedValue(0);

    // Swipe-down gesture detection
    const swipeGesture = Gesture.Pan()
       .onUpdate((event) => {
          if (event.translationY > 0) {
             translateY.value = event.translationY;
          }
       })
       .onEnd((event) => {
          if (event.translationY > 150) {
             runOnJS(onDismiss)(); // Dismiss when swiped far enough
          } else {
             translateY.value = withSpring(0); // Snap back if not enough swipe
          }
       });
 
    const animatedStyle = useAnimatedStyle(() => ({
       transform: [{ translateY: translateY.value }],
    }));

    return (
        <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.card, animatedStyle]}>
           <TouchableOpacity style={styles.dragBar} />
           <Image source={{ uri: profilePicture || "https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg" }} style={styles.avatar} />
           <Text style={styles.name}>{name}</Text>
           <Text style={styles.handle}>@{handle}</Text>
           <Text style={styles.description}>
              {bio}
           </Text>
           <Text style={styles.sharedGroups}>About:</Text>
           <View style={styles.groupsContainer}>
              <Text style={styles.groupTag}>React Developers</Text>
              <Text style={styles.groupTag}>Mobile Coders</Text>
              <Text style={styles.groupTag}>Tech Enthusiasts</Text>
           </View>
        </Animated.View>
     </GestureDetector>
    )
}

export default UserInfoCard;

const styles = StyleSheet.create({
    card: {
       position: "absolute",
       bottom: 0,
       width: "100%",
       height: "70%",
       backgroundColor: "white",
       padding: 20,
       borderTopLeftRadius: 30,
       borderTopRightRadius: 30,
       shadowColor: "#000",
       shadowOpacity: 0.1,
       shadowRadius: 2,
       elevation: 2,
       alignItems: "center",
       zIndex: 1000
    },
    dragBar: {
       width: 50,
       height: 5,
       backgroundColor: "#ccc",
       borderRadius: 3,
       marginBottom: 30,
    },
    avatar: {
       width: 140,
       height: 140,
       borderRadius: 70,
       marginBottom: 10,
    },
    name: {
       fontSize: 20,
       fontWeight: "bold",
    },
    handle: {
       fontSize: 16,
       color: "gray",
    },
    description: {
       fontSize: 14,
       textAlign: "center",
       marginVertical: 10,
    },
    sharedGroups: {
       fontSize: 16,
       fontWeight: "bold",
       marginTop: 10,
    },
    groupsContainer: {
       flexDirection: "row",
       flexWrap: "wrap",
       justifyContent: "center",
       marginTop: 5,
    },
    groupTag: {
       backgroundColor: "#ddd",
       paddingVertical: 5,
       paddingHorizontal: 10,
       borderRadius: 15,
       margin: 5,
       fontSize: 14,
    },
 });