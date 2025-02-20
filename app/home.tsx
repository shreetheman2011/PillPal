import { useFrequency } from "@/context/FrequencyContext";
import {
  registerForPushnotificationsAsync,
  scheduleMedicationReminder,
} from "@/utils/notifications";
import {
  DoseHistory,
  getMedication,
  getTodaysDoses,
  Medication,
  recordDose,
} from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

const { width } = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add-circle-outline" as const,
    label: "Add\nMedication",
    route: "/medications/add" as const,
    color: "#2E7D32",
    gradient: ["#4CAF50", "#2E7D32"] as [string, string],
  },
  {
    icon: "calendar-outline" as const,
    label: "Calendar\nView",
    route: "/calendar" as const,
    color: "#1976D2",
    gradient: ["#2196F3", "#1976D2"] as [string, string],
  },
  {
    icon: "time-outline" as const,
    label: "History\nLog",
    route: "/history" as const,
    color: "#C2185B",
    gradient: ["#E91E63", "#C2185B"] as [string, string],
  },
  {
    icon: "medical-outline" as const,
    label: "Refill\nTracker",
    route: "/refills" as const,
    color: "#E64A19",
    gradient: ["#FF5722", "#E64A19"] as [string, string],
  },
];

interface CircularPorgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

export default function HomeScreen() {
  const { frequency } = useFrequency();
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const router = useRouter();
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);

  // useEffect(() => {
  //   AsyncStorage.clear();
  // }, []);

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses] = await Promise.all([
        getMedication(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      const today = new Date();
      const todaysMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const duratationDays = parseInt(med.duration.split(" ")[0]);

        if (
          duratationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + duratationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });
      setTodaysMedications(todaysMeds);
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      console.error("Error loading medications: ", error);
    }
  }, []);
  const setupNotifications = async () => {
    try {
      const token = await registerForPushnotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }
      // Schedule reminders for all medications
      const medications = await getMedication();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  useEffect(() => {
    loadMedications();
    setupNotifications();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      return () => unsubscribe();
    }, [loadMedications])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());

      await loadMedications();
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };
  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };
  const progress =
    todaysMedications.length > 0
      ? completedDoses / todaysMedications.length
      : 0;
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#1a8e2d", "#146922"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Daily Progress</Text>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={"white"}
              />
              {
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>2</Text>
                </View>
              }
            </TouchableOpacity>
          </View>
          {/* circular progress */}
          <CircularProgress
            progress={progress}
            completedDoses={completedDoses}
            totalDoses={todaysMedications.length}
          />
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Link href={action.route} key={action.label} asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionIcon}>
                        <Ionicons
                          name={action.icon}
                          size={40}
                          color={"white"}
                        />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Link href="/calendar" asChild>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {todaysMedications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No Medications Scheduled For Today
            </Text>
            <Link href="/medications/add" asChild>
              <TouchableOpacity style={styles.addMedicationButton}>
                <Text style={styles.addMedicationButtonText}>
                  Add Medication
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          todaysMedications.map((medication) => {
            const taken = isDoseTaken(medication.id);

            return (
              <View style={styles.doseCard}>
                <View
                  style={[
                    styles.doseBadge,
                    {
                      backgroundColor: `${medication.color}15`,
                    },
                  ]}
                >
                  <Ionicons name="medical" size={24} />
                </View>
                <View style={styles.doseInfo}>
                  <View>
                    <Text style={styles.medicineName}>{medication.name}</Text>
                    <Text style={styles.dosageInfo}>{medication.dosage}</Text>
                  </View>

                  <View style={styles.doseTime}>
                    <Ionicons name="time-outline" size={24} color="#ccc" />
                    {medication.times.map((time, index) => (
                      <Text key={index} style={styles.timeText}>
                        {time}
                        {index < medication.times.length - 1 && ", "}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.doseTime}>
                    <Ionicons
                      name="sync"
                      style={{ marginRight: 5, marginTop: 5 }}
                      size={24}
                      color="#ccc"
                    />

                    <Text style={styles.frequencyText}>{frequency}</Text>
                  </View>
                </View>
                {taken ? (
                  <View style={styles.takeDoseButton}>
                    <Ionicons name="checkmark-circle-outline" size={24} />
                    <Text style={styles.takeDoseText}>Taken</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.takeDoseButton,
                      {
                        backgroundColor: medication.color,
                      },
                    ]}
                    onPress={() => handleTakeDose(medication)}
                  >
                    <Text style={styles.takeDoseText}>Take</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
      <Modal visible={false} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notification(s)</Text>
            <TouchableOpacity style={styles.closeButton}>
              <Ionicons name="close" size={24} color={"#333"} />
            </TouchableOpacity>
          </View>
          {[].map((medication) => (
            <View style={styles.notificationItem}>
              <View style={styles.notificationIcon}>
                <Ionicons name="medical" size={24} />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>medication name</Text>
                <Text style={styles.notificationMessage}>
                  medication dosage
                </Text>
                <Text style={styles.notificationTime}>medication time</Text>
              </View>
            </View>
          ))}
        </View>
      </Modal>
    </ScrollView>
  );
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
}: CircularPorgressProps) {
  const animationValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.55;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: progress,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animationValue.interpolate({
    inputRange: [0, 1], // Since progress is in percentages (0 to 100)
    outputRange: [circumference, 0], // Full circle at 100%, empty at 0%
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressDetails}>
          {completedDoses} of {totalDoses} doses
        </Text>
      </View>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 20,
    fontFamily: "Happy-Monkey",
    color: "white",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },

  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rbga(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff5252",
    borderRadius: 10,
    height: 25,
    justifyContent: "center",
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 2,
    minWidth: 25,
    borderColor: "#146922",
  },
  notificationCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    zIndex: 1,
    marginTop: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercentage: {
    fontSize: 36,
    color: "white",
    fontWeight: "bold",
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "bold",
  },
  progressDetails: {
    fontSize: 11,
    color: "white",
    fontWeight: "bold",
  },

  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },

  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
    // fontFamily: "Outfit-Bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  seeAllButton: {
    color: "#2E7D32",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: "#1a8e2d",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14,
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  frequencyText: {
    fontSize: 14,
    color: "#555",
    marginTop: 8,
  },
});
