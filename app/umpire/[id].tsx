/**
 * Umpire scoring panel for a live match.
 * Lets the assigned umpire record runs, wickets, extras, switch innings, and complete the match.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaHeader } from '@/hooks/useSafeAreaHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { ThemedBackground } from '@/components/ThemedBackground';
import { useTheme } from '@/providers/ThemeProvider';
import { 
  subscribeToMatch, 
  updateMatchStatus, 
  addRuns as addRunsService, 
  addDotBall as addDotBallService,
  addWide as addWideService,
  addNoBall as addNoBallService,
  addWicket as addWicketService,
  switchInnings,
  setupSecondInnings,
  selectBowler
} from '@/services/matches';
import { getUsersByUids } from '@/services/users';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Button } from '@/components/Button';

/**
 * Umpire-only screen for scoring a match (route param: match id).
 * Subscribes to match, enforces umpire identity. Supports runs, dot, wide, no-ball, wicket,
 * bowler selection, innings switch, and second-innings setup. Shows countdown for upcoming matches.
 */
export default function UmpireScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [batsmenModalVisible, setBatsmenModalVisible] = useState(false);
  const [dismissedBatsmanUid, setDismissedBatsmanUid] = useState<string | null>(null);
  const [secondInningsSetupOpen, setSecondInningsSetupOpen] = useState(false);
  const [secondInningsBatsmen, setSecondInningsBatsmen] = useState<string[]>([]);
  const [secondInningsOnStrike, setSecondInningsOnStrike] = useState<string | null>(null);
  const [bowlerSelectionModalVisible, setBowlerSelectionModalVisible] = useState(false);
  const [selectingBowler, setSelectingBowler] = useState(false);
  const [processingInningsTransition, setProcessingInningsTransition] = useState(false);
  const [teamAPlayers, setTeamAPlayers] = useState<User[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<User[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [pendingRuns, setPendingRuns] = useState(0);
  const [addRunsModalVisible, setAddRunsModalVisible] = useState(false);
  const [ballHistory, setBallHistory] = useState<Array<{type: string, runs: number, timestamp: number}>>([]);
  const [wideModalVisible, setWideModalVisible] = useState(false);
  const [noBallModalVisible, setNoBallModalVisible] = useState(false);
  const [byeModalVisible, setByeModalVisible] = useState(false);
  const [legByeModalVisible, setLegByeModalVisible] = useState(false);
  const [rareRunsModalVisible, setRareRunsModalVisible] = useState(false);
  const [shortcutsExpanded, setShortcutsExpanded] = useState(false);
  const router = useRouter();
  const { headerStyle } = useSafeAreaHeader();
  const { theme, colors } = useTheme();

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMatch(id, (matchData) => {
      setMatch(matchData);
      setLoading(false);
    });

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (!match) return;
    
    const fetchPlayers = async () => {
      try {
        setLoadingPlayers(true);
        
        const teamAUids = (match.teamA.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        const teamBUids = (match.teamB.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        
        const [playersA, playersB] = await Promise.all([
          teamAUids.length > 0 ? getUsersByUids(teamAUids) : Promise.resolve([]),
          teamBUids.length > 0 ? getUsersByUids(teamBUids) : Promise.resolve([])
        ]);
        
        setTeamAPlayers(playersA);
        setTeamBPlayers(playersB);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };
    
    fetchPlayers();
  }, [match?.teamA.playerUids, match?.teamB.playerUids]);

  // Check if bowler selection is needed
  useEffect(() => {
    if (!match || match.status !== 'live' || !match.battingTeam) return;
    
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    
    // Check if innings is already complete
    const totalBallsBowled = currentInnings.overs * 6 + currentInnings.balls;
    const maxBalls = match.totalOvers * 6;
    const isComplete = totalBallsBowled >= maxBalls || currentInnings.wickets >= 10;
    
    // Only show bowler selection if:
    // 1. No current bowler
    // 2. Balls === 0 (new over starting)
    // 3. Innings is NOT complete
    // 4. 2nd innings setup is NOT open
    if (!currentInnings?.currentBowlerUid && currentInnings?.balls === 0 && !isComplete && !secondInningsSetupOpen) {
      setBowlerSelectionModalVisible(true);
    }
  }, [match?.teamAInnings?.currentBowlerUid, match?.teamBInnings?.currentBowlerUid, match?.teamAInnings?.balls, match?.teamBInnings?.balls, match?.teamAInnings?.overs, match?.teamBInnings?.overs, match?.teamAInnings?.wickets, match?.teamBInnings?.wickets, match?.status, match?.battingTeam, match?.totalOvers]);

  // Define checkInningsComplete BEFORE early returns to avoid hook order violation
  const checkTargetReached = useCallback(async () => {
    if (!match || !id || processingInningsTransition || match.currentInnings !== 2) return false;
    
    const currentInnings = match.battingTeam === "teamA" ? match.teamAInnings : match.teamBInnings;
    const bowlingTeamInnings = match.battingTeam === "teamA" ? match.teamBInnings : match.teamAInnings;
    
    if (!currentInnings || !bowlingTeamInnings) return false;

    const targetRuns = bowlingTeamInnings.runs + 1;
    
    if (currentInnings.runs >= targetRuns) {
      setProcessingInningsTransition(true);
      try {
        await updateMatchStatus(id, "completed");
        const winner = match.battingTeam === "teamA" ? match.teamA.name : match.teamB.name;
        const wicketsLost = currentInnings.wickets;
        const wicketsWonBy = 10 - wicketsLost;
        
        Alert.alert(
          "Match Complete",
          winner + " won by " + wicketsWonBy + " wicket" + (wicketsWonBy !== 1 ? "s" : "") + "!",
          [
            { text: "OK", onPress: () => router.back() }
          ]
        );
        return true;
      } catch (error) {
        console.error("Error completing match:", error);
      } finally {
        setProcessingInningsTransition(false);
      }
    }
    return false;
  }, [match, id, router, processingInningsTransition]);

  const checkInningsComplete = useCallback(async () => {
    if (!match || !id || processingInningsTransition) return;
    
    const currentInnings = match?.battingTeam === "teamA" ? match?.teamAInnings : match?.teamBInnings;
    if (!currentInnings) return;
    
    const totalBallsBowled = currentInnings.overs * 6 + currentInnings.balls;
    const maxBalls = (match?.totalOvers || 0) * 6;
    
    if (totalBallsBowled >= maxBalls || currentInnings.wickets >= 10) {
      setProcessingInningsTransition(true);
      
      if (match.currentInnings === 1) {
        if (!id) return;
        try {
          await switchInnings(id);
          setSecondInningsBatsmen([]);
          setSecondInningsOnStrike(null);
          setSecondInningsSetupOpen(true);
        } catch (error) {
          console.error("Error switching innings:", error);
          Alert.alert("Error", "Failed to start 2nd innings");
        } finally {
          setProcessingInningsTransition(false);
        }
      } else {
        if (!id) return;
        await updateMatchStatus(id, "completed");
        const teamAScore = match.teamAInnings?.runs || 0;
        const teamBScore = match.teamBInnings?.runs || 0;
        const winner = teamAScore > teamBScore ? match.teamA.name : teamBScore > teamAScore ? match.teamB.name : "Tie";
        
        Alert.alert(
          "Match Complete",
          winner === "Tie" ? "Match ended in a tie!" : winner + " won the match!",
          [
            { text: "OK", onPress: () => router.back() }
          ]
        );
        setProcessingInningsTransition(false);
      }
    }
  }, [match, id, router, processingInningsTransition]);

  useEffect(() => {
    if (!match || !match.battingTeam || match.status !== "live") return;
    
    const currentInnings = match.battingTeam === "teamA" ? match.teamAInnings : match.teamBInnings;
    if (!currentInnings) return;

    // Check for target reached in 2nd innings
    if (match.currentInnings === 2) {
      const bowlingTeamInnings = match.battingTeam === "teamA" ? match.teamBInnings : match.teamAInnings;
      if (bowlingTeamInnings) {
        const targetRuns = bowlingTeamInnings.runs + 1;
        if (currentInnings.runs >= targetRuns) {
          const timer = setTimeout(() => {
            checkTargetReached();
          }, 500);
          return () => clearTimeout(timer);
        }
      }
    }

    const totalBallsBowled = currentInnings.overs * 6 + currentInnings.balls;
    const maxBalls = (match.totalOvers || 0) * 6;
    
    if (totalBallsBowled >= maxBalls || currentInnings.wickets >= 10) {
      if (match.currentInnings === 2) {
        const timer = setTimeout(() => {
          checkInningsComplete();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [
    match?.teamAInnings?.runs, 
    match?.teamBInnings?.runs,
    match?.teamAInnings?.overs, 
    match?.teamBInnings?.overs, 
    match?.teamAInnings?.balls, 
    match?.teamBInnings?.balls, 
    match?.teamAInnings?.wickets, 
    match?.teamBInnings?.wickets, 
    match?.status, 
    match?.battingTeam, 
    match?.totalOvers, 
    match?.currentInnings,
    checkInningsComplete,
    checkTargetReached
  ]);

  // Early returns must come AFTER all hooks
  if (loading) {
    return (
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.accent} />
      </ThemedBackground>
    );
  }

  if (!match) {
    return (
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: colors.textTertiary }]}>Match not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedBackground>
    );
  }

  // Check if current user is the umpire
  if (!userProfile || match.umpireUid !== userProfile.uid) {
    return (
      <ThemedBackground style={styles.centerContainer}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <Text style={[styles.errorText, { color: colors.textTertiary }]}>Unauthorized: You are not the umpire for this match</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </ThemedBackground>
    );
  }

  // Helper function to check if innings is complete
  const isInningsComplete = (): boolean => {
    if (!match || !match.battingTeam) return false;
    
    const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
    const totalBallsBowled = currentInnings.overs * 6 + currentInnings.balls;
    const maxBalls = match.totalOvers * 6;
    
    return totalBallsBowled >= maxBalls || currentInnings.wickets >= 10;
  };

  const addRuns = async (runs: number) => {
    if (!id || scoring || !match) return;
    
    // Check if innings is complete BEFORE attempting to score
    if (isInningsComplete()) {
      // Automatically trigger innings completion check
      await checkInningsComplete();
      return;
    }
    
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    
    try {
      setScoring(true);
      await addRunsService(id, runs, onStrikeBatsman.uid);
      setBallHistory(prev => [...prev, { type: 'run', runs, timestamp: Date.now() }]);
      const targetReached = await checkTargetReached();
      if (!targetReached) {
        await checkInningsComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update score');
    } finally {
      setScoring(false);
    }
  };

  const addDotBall = async () => {
    if (!id || scoring || !match) return;
    
    // Check if innings is complete BEFORE attempting to score
    if (isInningsComplete()) {
      // Automatically trigger innings completion check
      await checkInningsComplete();
      return;
    }
    
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    
    try {
      setScoring(true);
      await addDotBallService(id, onStrikeBatsman.uid);
      setBallHistory(prev => [...prev, { type: 'run', runs: 0, timestamp: Date.now() }]);
      const targetReached = await checkTargetReached();
      if (!targetReached) {
        await checkInningsComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add dot ball');
    } finally {
      setScoring(false);
    }
  };

  const addWide = async (extraRuns: number) => {
    if (!id || scoring) return;
    
    // Check if innings is complete BEFORE attempting to score
    if (isInningsComplete()) {
      // Automatically trigger innings completion check
      await checkInningsComplete();
      return;
    }
    
    try {
      setScoring(true);
      await addWideService(id, extraRuns);
      setBallHistory(prev => [...prev, { type: 'wide', runs: extraRuns, timestamp: Date.now() }]);
      const targetReached = await checkTargetReached();
      if (!targetReached) {
        await checkInningsComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add wide');
    } finally {
      setScoring(false);
    }
  };

  const addNoBall = async (extraRuns: number) => {
    if (!id || scoring) return;
    
    // Check if innings is complete BEFORE attempting to score
    if (isInningsComplete()) {
      // Automatically trigger innings completion check
      await checkInningsComplete();
      return;
    }
    
    try {
      setScoring(true);
      await addNoBallService(id, extraRuns);
      setBallHistory(prev => [...prev, { type: 'noball', runs: extraRuns, timestamp: Date.now() }]);
      const targetReached = await checkTargetReached();
      if (!targetReached) {
        await checkInningsComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add no ball');
    } finally {
      setScoring(false);
    }
  };

  const handleWicket = async () => {
    if (!match) return;
    
    // Check if innings is complete BEFORE attempting to score
    if (isInningsComplete()) {
      // Automatically trigger innings completion check
      await checkInningsComplete();
      return;
    }
    
    const onStrikeBatsman = (match.currentBatsmen || []).find(b => b.isOnStrike);
    if (!onStrikeBatsman) {
      Alert.alert('Error', 'No batsman on strike');
      return;
    }
    setDismissedBatsmanUid(onStrikeBatsman.uid);
    setBatsmenModalVisible(true);
  };

  const handleSelectNewBatsman = async (newBatsmanUid: string) => {
    if (!id || !dismissedBatsmanUid) return;
    
    try {
      setScoring(true);
      setBatsmenModalVisible(false);
      await addWicketService(id, dismissedBatsmanUid, newBatsmanUid);
      setBallHistory(prev => [...prev, { type: 'wicket', runs: 0, timestamp: Date.now() }]);
      setDismissedBatsmanUid(null);
      const targetReached = await checkTargetReached();
      if (!targetReached) {
        await checkInningsComplete();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record wicket');
    } finally {
      setScoring(false);
    }
  };

  // Accumulation mode handlers for new runs panel
  const handleAccumulateRuns = (runs: number) => {
    setPendingRuns(prev => prev + runs);
  };

  const handleScorePendingRuns = async () => {
    if (pendingRuns === 0) return;
    await addRuns(pendingRuns);
    setPendingRuns(0);
  };

  const handleCancelPending = () => {
    setPendingRuns(0);
    setAddRunsModalVisible(false);
  };

  const handleOpenAddRunsModal = () => {
    setAddRunsModalVisible(true);
  };

  const handleAddExtraRuns = (extraRuns: number) => {
    setPendingRuns(prev => prev + extraRuns);
    setAddRunsModalVisible(false);
  };

  const handleUndo = () => {
    if (ballHistory.length === 0) {
      Alert.alert('No Action', 'No balls to undo');
      return;
    }
    
    Alert.alert(
      'Undo Last Ball',
      'Undo functionality requires manual correction in match state. Remove last ball from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove from History',
          onPress: () => {
            setBallHistory(prev => prev.slice(0, -1));
            Alert.alert('Note', 'Ball removed from history. Please manually correct match score if needed.');
          }
        }
      ]
    );
  };

  const handleWideWithRuns = async (runs: number) => {
    setWideModalVisible(false);
    await addWide(runs);
  };

  const handleNoBallWithRuns = async (runs: number) => {
    setNoBallModalVisible(false);
    await addNoBall(runs);
  };

  const handleByeRuns = async (runs: number) => {
    setByeModalVisible(false);
    if (!id || scoring) return;
    try {
      setScoring(true);
      await addRunsService(id, runs, ''); // Byes don't credit batsman
      setBallHistory(prev => [...prev, { type: 'bye', runs, timestamp: Date.now() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add byes');
    } finally {
      setScoring(false);
    }
  };

  const handleLegByeRuns = async (runs: number) => {
    setLegByeModalVisible(false);
    if (!id || scoring) return;
    try {
      setScoring(true);
      await addRunsService(id, runs, ''); // Leg byes don't credit batsman
      setBallHistory(prev => [...prev, { type: 'legbye', runs, timestamp: Date.now() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add leg byes');
    } finally {
      setScoring(false);
    }
  };

  const handleRareRuns = async (runs: number) => {
    setRareRunsModalVisible(false);
    await addRuns(runs);
  };

  const handleSecondInningsBatsmanSelect = (uid: string) => {
    if (secondInningsBatsmen.includes(uid)) {
      setSecondInningsBatsmen(secondInningsBatsmen.filter(b => b !== uid));
      if (secondInningsOnStrike === uid) {
        setSecondInningsOnStrike(null);
      }
    } else if (secondInningsBatsmen.length < 2) {
      setSecondInningsBatsmen([...secondInningsBatsmen, uid]);
      if (secondInningsBatsmen.length === 0) {
        setSecondInningsOnStrike(uid);
      }
    } else {
      Alert.alert('Maximum Batsmen', 'Only 2 batsmen can be on the crease at a time');
    }
  };

  const handleStartSecondInnings = async () => {
    if (!id) return;
    
    if (secondInningsBatsmen.length !== 2) {
      Alert.alert('Error', 'Please select exactly 2 opening batsmen');
      return;
    }

    if (!secondInningsOnStrike) {
      Alert.alert('Error', 'Please select which batsman is on strike');
      return;
    }

    try {
      setScoring(true);
      
      const openingBatsmen = secondInningsBatsmen.map(uid => ({
        uid,
        isOnStrike: uid === secondInningsOnStrike
      }));

      await setupSecondInnings(id, openingBatsmen);
      
      setSecondInningsSetupOpen(false);
      setSecondInningsBatsmen([]);
      setSecondInningsOnStrike(null);
      setProcessingInningsTransition(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to setup 2nd innings');
    } finally {
      setScoring(false);
    }
  };

  const handleSelectBowler = async (bowlerUid: string) => {
    if (!id) return;
    
    try {
      setSelectingBowler(true);
      await selectBowler(id, bowlerUid);
      setBowlerSelectionModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select bowler');
    } finally {
      setSelectingBowler(false);
    }
  };



  const startMatch = () => {
    if (!id) return;
    // Navigate to toss screen for match setup
    router.push(`/umpire/toss/${id}`);
  };

  const completeMatch = async () => {
    if (!id) return;
    Alert.alert(
      'Complete Match',
      'Are you sure you want to mark this match as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateMatchStatus(id, 'completed');
              Alert.alert('Success', 'Match completed');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete match');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedBackground style={styles.container}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, headerStyle, { backgroundColor: colors.cardBg, borderBottomColor: colors.borderDefault }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Umpire Panel</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {match.scheduledDate && match.status === 'upcoming' && (
            <CountdownTimer scheduledDate={match.scheduledDate} />
          )}
          <Text style={[styles.matchTitle, { color: colors.textPrimary }]}>
            {match.teamA.name} vs {match.teamB.name}
          </Text>

          {match.battingTeam ? (
            <>
              <View style={[
                styles.scoreDisplay, 
                { backgroundColor: colors.cardBgElevated },
                theme === 'dark' && styles.scoreDisplayGlow
              ]}>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Current Score</Text>
                <Text style={[
                  styles.scoreValue, 
                  { color: colors.textPrimary },
                  theme === 'dark' && { textShadowColor: 'rgba(59, 130, 246, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }
                ]}>
                  {match.battingTeam === 'teamA' 
                    ? `${match.teamAInnings.runs}/${match.teamAInnings.wickets}`
                    : `${match.teamBInnings.runs}/${match.teamBInnings.wickets}`
                  }
                </Text>
                <Text style={[styles.oversValue, { color: colors.textSecondary }]}>
                  ({match.battingTeam === 'teamA'
                    ? `${match.teamAInnings.overs}.${match.teamAInnings.balls}`
                    : `${match.teamBInnings.overs}.${match.teamBInnings.balls}`
                  } / {match.totalOvers} overs)
                </Text>
              </View>

              {isInningsComplete() && match.currentInnings === 1 && (
                <View style={[styles.inningsCompleteCard, { backgroundColor: colors.selected, borderColor: colors.selectedBorder }]}>
                  <Text style={[styles.inningsCompleteText, { color: colors.selectedBorder }]}>
                    First Innings Complete!
                  </Text>
                  <TouchableOpacity 
                    style={[styles.startSecondInningsButton, { backgroundColor: colors.selectedBorder }]}
                    onPress={() => checkInningsComplete()}
                  >
                    <Text style={styles.startSecondInningsButtonText}>Start 2nd Innings</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.bowlerInfo, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.bowlerLabel, { color: colors.textSecondary }]}>Current Bowler</Text>
                {(() => {
                  const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
                  const bowlingPlayers = match.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers;
                  
                  if (currentInnings?.currentBowlerUid) {
                    const bowler = bowlingPlayers.find(p => p.uid === currentInnings.currentBowlerUid);
                    const bowlerStats = currentInnings.bowlers?.find(b => b.uid === currentInnings.currentBowlerUid);
                    
                    return (
                      <Text style={[styles.bowlerName, { color: colors.accent }]}>
                        {bowler?.name || 'Unknown'} 
                        {bowlerStats && ` (${bowlerStats.overs}.${bowlerStats.balls} - ${bowlerStats.runs}/${bowlerStats.wickets})`}
                      </Text>
                    );
                  } else {
                    return (
                      <TouchableOpacity onPress={() => setBowlerSelectionModalVisible(true)}>
                        <Text style={[styles.selectBowlerText, { color: colors.upcoming }]}>Tap to Select Bowler</Text>
                      </TouchableOpacity>
                    );
                  }
                })()}
              </View>
            </>
          ) : (
            <View style={[
              styles.scoreDisplay, 
              { backgroundColor: colors.cardBgElevated },
              theme === 'dark' && styles.scoreDisplayGlow
            ]}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Waiting for Toss</Text>
              <Text style={[styles.scoreValue, { color: colors.textPrimary }]}>0/0</Text>
              <Text style={[styles.oversValue, { color: colors.textSecondary }]}>(0.0 overs)</Text>
            </View>
          )}

          {match.status === 'upcoming' && (
            <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
              <Button title="Conduct Toss & Start Match" onPress={startMatch} />
            </View>
          )}

          {match.status === 'live' && match.battingTeam && (
            <>
              {/* Innings and Team Info */}
              <View style={[styles.inningsInfo, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.inningsLabel, { color: colors.textSecondary }]}>
                  {match.currentInnings === 1 ? '1st' : '2nd'} Innings  •  Overs: {(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).overs}.{(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).balls}/{match.totalOvers}
                </Text>
                <Text style={[styles.teamBatting, { color: colors.textPrimary }]}>
                  {match.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} Batting
                </Text>
                {match.currentInnings === 2 && (
                  <Text style={[styles.targetText, { color: colors.upcoming }]}>
                    Target: {(match.battingTeam === 'teamA' ? match.teamBInnings.runs : match.teamAInnings.runs) + 1} runs
                  </Text>
                )}
              </View>

              {/* Current Batsmen */}
              {match.currentBatsmen && match.currentBatsmen.length > 0 && (
                <View style={[styles.batsmenSection, { backgroundColor: colors.cardBg }]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Current Batsmen</Text>
                  {match.currentBatsmen.map((batsman) => {
                    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.uid === batsman.uid);
                    return (
                      <View 
                        key={batsman.uid} 
                        style={[
                          styles.batsmanCard,
                          { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder },
                          batsman.isOnStrike && { backgroundColor: colors.strikeHighlight, borderColor: colors.strikeBorder, borderWidth: 2 }
                        ]}
                      >
                        <View style={styles.batsmanInfo}>
                          <Text style={[styles.batsmanName, { color: colors.textPrimary }]}>
                            {player?.name || 'Unknown'}
                            {batsman.isOnStrike && ' *'}
                          </Text>
                          <Text style={[styles.batsmanStats, { color: colors.textSecondary }]}>
                            {batsman.runs} runs ({batsman.balls} balls)
                          </Text>
                        </View>
                        {batsman.isOnStrike && (
                          <Ionicons name="radio-button-on" size={20} color={colors.strikeBorder} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Ball History */}
              {ballHistory.length > 0 && (
                <View style={[styles.ballHistorySection, { backgroundColor: colors.cardBg }]}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.ballHistoryContainer}
                  >
                    {ballHistory.slice(-10).map((ball, index) => {
                      const isRecent = index === ballHistory.slice(-10).length - 1;
                      const ballColor = ball.type === 'wicket' ? colors.wicket
                        : ball.type === 'wide' || ball.type === 'noball' ? colors.extrasBorder
                        : (ball.runs === 4 || ball.runs === 6) ? colors.boundaryBorder
                        : colors.gridButtonBorder;
                      const displayText = ball.type === 'wicket' ? 'W' : 
                                         ball.type === 'wide' ? 'Wd' : 
                                         ball.type === 'noball' ? 'Nb' :
                                         ball.type === 'bye' ? `${ball.runs}b` :
                                         ball.type === 'legbye' ? `${ball.runs}lb` :
                                         ball.runs.toString();
                      return (
                        <View 
                          key={`${ball.timestamp}-${index}`}
                          style={[
                            styles.ballHistoryCircle,
                            { backgroundColor: colors.gridButton, borderColor: ballColor },
                            isRecent && { backgroundColor: colors.upcoming, borderColor: colors.upcoming }
                          ]}
                        >
                          <Text style={[styles.ballHistoryText, { color: isRecent ? '#fff' : colors.textPrimary }]}>{displayText}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Runs - CricHeros Style 3x4 Grid */}
              <View style={[styles.runsSection, { backgroundColor: colors.scoringBg }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Scoring</Text>
                
                {/* Row 1: 0, 1, 2, Undo */}
                <View style={styles.gridRow}>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={addDotBall}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addRuns(1)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addRuns(2)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.undo, borderColor: colors.undoBorder }, ballHistory.length === 0 && styles.disabledButton]} 
                    onPress={handleUndo}
                    disabled={ballHistory.length === 0}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.undoBorder }]}>Undo</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Row 2: 3, 4, 6, 5,7 */}
                <View style={styles.gridRow}>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addRuns(3)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>3</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.boundary, borderColor: colors.boundaryBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addRuns(4)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>4</Text>
                    <Text style={[styles.gridButtonLabel, { color: colors.boundaryBorder }]}>FOUR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.boundary, borderColor: colors.boundaryBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addRuns(6)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonText, { color: colors.textPrimary }]}>6</Text>
                    <Text style={[styles.gridButtonLabel, { color: colors.boundaryBorder }]}>SIX</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => setRareRunsModalVisible(true)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.textSecondary }]}>5, 7</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Row 3: Wd, Nb, Bye, Lb */}
                <View style={styles.gridRow}>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.extras, borderColor: colors.extrasBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => setWideModalVisible(true)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.extrasBorder }]}>Wd</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.extras, borderColor: colors.extrasBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => setNoBallModalVisible(true)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.extrasBorder }]}>Nb</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.extras, borderColor: colors.extrasBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => setByeModalVisible(true)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.extrasBorder }]}>Bye</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gridButton, { backgroundColor: colors.extras, borderColor: colors.extrasBorder }, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => setLegByeModalVisible(true)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={[styles.gridButtonTextSecondary, { color: colors.extrasBorder }]}>Lb</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Wicket */}
              <View style={[styles.wicketSection, { backgroundColor: colors.scoringBg }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Wicket</Text>
                <TouchableOpacity
                  style={[styles.scoreButton, styles.fullWidthButton, { backgroundColor: colors.wicket }, (scoring || isInningsComplete()) && styles.disabledButton]}
                  onPress={handleWicket}
                  disabled={scoring || isInningsComplete()}
                >
                  <Text style={styles.scoreButtonText}>Wicket</Text>
                </TouchableOpacity>
              </View>

              {/* Scoring Shortcuts - Expandable */}
              <View style={[styles.shortcutsSection, { backgroundColor: colors.cardBg }]}>
                <TouchableOpacity 
                  style={styles.shortcutsHeader}
                  onPress={() => setShortcutsExpanded(!shortcutsExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.shortcutsTitle, { color: colors.textPrimary }]}>Scoring Shortcuts</Text>
                  <Ionicons 
                    name={shortcutsExpanded ? 'chevron-up' : 'chevron-down'} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
                
                {shortcutsExpanded && (
                  <View style={styles.shortcutsContent}>
                    <TouchableOpacity 
                      style={[styles.shortcutButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }]}
                      onPress={() => setBowlerSelectionModalVisible(true)}
                      disabled={scoring || isInningsComplete()}
                    >
                      <Ionicons name="person-outline" size={20} color={colors.accent} />
                      <Text style={[styles.shortcutButtonText, { color: colors.textPrimary }]}>Change Bowler</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.shortcutButton, { backgroundColor: colors.gridButton, borderColor: colors.gridButtonBorder }]}
                      onPress={completeMatch}
                      disabled={scoring}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={colors.completed} />
                      <Text style={[styles.shortcutButtonText, { color: colors.textPrimary }]}>Complete Match</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {match.status === 'completed' && (
            <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.completedText, { color: colors.completed }]}>Match Completed</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Batsman Selection Modal */}
      <Modal
        visible={batsmenModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBatsmenModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }, theme === 'dark' && { borderWidth: 1, borderColor: colors.borderDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderDefault }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select New Batsman</Text>
              <TouchableOpacity onPress={() => setBatsmenModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingPlayers ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
              ) : (
                <>
                  {(match?.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers)
                    .filter(player => !(match?.currentBatsmen || []).some(b => b.uid === player.uid))
                    .map((player) => (
                      <TouchableOpacity
                        key={player.uid}
                        style={[styles.playerSelectItem, { backgroundColor: colors.cardBg, borderColor: colors.borderDefault }]}
                        onPress={() => handleSelectNewBatsman(player.uid)}
                      >
                        <View style={[styles.playerSelectAvatar, { backgroundColor: colors.accent }]}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={[styles.playerSelectName, { color: colors.textPrimary }]}>{player.name}</Text>
                          {player.username && (
                            <Text style={[styles.playerSelectUsername, { color: colors.textSecondary }]}>@{player.username}</Text>
                          )}
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.accent} />
                      </TouchableOpacity>
                    ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2nd Innings Setup Modal */}
      <Modal
        visible={secondInningsSetupOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSecondInningsSetupOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }, theme === 'dark' && { borderWidth: 1, borderColor: colors.borderDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderDefault }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>2nd Innings Setup</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {match?.battingTeam === 'teamA' ? match?.teamA.name : match?.teamB.name} to Bat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSecondInningsSetupOpen(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.setupInstructions, { color: colors.textSecondary }]}>
                Select 2 opening batsmen ({secondInningsBatsmen.length}/2 selected)
              </Text>

              {loadingPlayers ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
              ) : (
                <>
                  {(match?.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers).map((player) => {
                    const isSelected = secondInningsBatsmen.includes(player.uid);
                    const isOnStrike = secondInningsOnStrike === player.uid;
                    
                    return (
                      <TouchableOpacity
                        key={player.uid}
                        style={[
                          styles.playerSelectItem,
                          { backgroundColor: colors.cardBg, borderColor: colors.borderDefault },
                          isSelected && { backgroundColor: colors.selected, borderColor: colors.selectedBorder },
                          isOnStrike && { backgroundColor: colors.strikeHighlight, borderColor: colors.strikeBorder }
                        ]}
                        onPress={() => handleSecondInningsBatsmanSelect(player.uid)}
                      >
                        <View style={[styles.playerSelectAvatar, { backgroundColor: colors.accent }]}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={[styles.playerSelectName, { color: colors.textPrimary }]}>{player.name}</Text>
                          {player.username && (
                            <Text style={[styles.playerSelectUsername, { color: colors.textSecondary }]}>@{player.username}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.selectedBorder} />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {secondInningsBatsmen.length === 2 && (
                    <>
                      <Text style={[styles.onStrikeInstructions, { color: colors.textSecondary }]}>
                        Tap a selected batsman to mark them on strike:
                      </Text>
                      
                      {secondInningsBatsmen.map((uid) => {
                        const player = (match?.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers).find(p => p.uid === uid);
                        if (!player) return null;
                        
                        return (
                          <TouchableOpacity
                            key={uid}
                            style={[
                              styles.strikeSelectItem,
                              { backgroundColor: colors.cardBg, borderColor: colors.borderDefault },
                              secondInningsOnStrike === uid && { backgroundColor: colors.strikeHighlight, borderColor: colors.strikeBorder }
                            ]}
                            onPress={() => setSecondInningsOnStrike(uid)}
                          >
                            <Text style={[styles.strikeSelectName, { color: colors.textPrimary }]}>{player.name}</Text>
                            {secondInningsOnStrike === uid && (
                              <Ionicons name="radio-button-on" size={24} color={colors.strikeBorder} />
                            )}
                          </TouchableOpacity>
                        );
                      })}

                      <View style={styles.startInningsButtonContainer}>
                        <Button
                          title="Start 2nd Innings"
                          onPress={handleStartSecondInnings}
                          loading={scoring}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bowler Selection Modal */}
      <Modal
        visible={bowlerSelectionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBowlerSelectionModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.modalBg }, theme === 'dark' && { borderWidth: 1, borderColor: colors.borderDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderDefault }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Bowler</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Choose who will bowl this over</Text>
              </View>
              <TouchableOpacity onPress={() => setBowlerSelectionModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingPlayers ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 20 }} />
              ) : (
                <>
                  {(match?.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers).map((player) => {
                    const currentInnings = match?.battingTeam === 'teamA' ? match?.teamAInnings : match?.teamBInnings;
                    const isLastBowler = currentInnings?.lastBowlerUid === player.uid;
                    const bowlerStats = currentInnings?.bowlers?.find(b => b.uid === player.uid);
                    const isCurrentBowler = currentInnings?.currentBowlerUid === player.uid;
                    
                    return (
                      <TouchableOpacity
                        key={player.uid}
                        style={[
                          styles.bowlerSelectItem,
                          { backgroundColor: colors.cardBg, borderColor: colors.borderDefault },
                          isLastBowler && { backgroundColor: colors.gridButton, opacity: 0.6 },
                          isCurrentBowler && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }
                        ]}
                        onPress={() => handleSelectBowler(player.uid)}
                        disabled={isLastBowler || selectingBowler}
                      >
                        <View style={[styles.playerSelectAvatar, { backgroundColor: colors.accent }]}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={[styles.playerSelectName, { color: colors.textPrimary }, isLastBowler && { color: colors.textTertiary }]}>
                            {player.name}
                          </Text>
                          {player.username && (
                            <Text style={[styles.playerSelectUsername, { color: colors.textSecondary }, isLastBowler && { color: colors.textTertiary }]}>
                              @{player.username}
                            </Text>
                          )}
                          {bowlerStats && (
                            <Text style={[styles.bowlerStatsText, { color: colors.accent }]}>
                              {bowlerStats.overs}.{bowlerStats.balls} overs - {bowlerStats.runs}/{bowlerStats.wickets}
                            </Text>
                          )}
                          {isLastBowler && (
                            <Text style={[styles.rotationRuleText, { color: colors.wicket }]}>
                              Cannot bowl consecutive overs
                            </Text>
                          )}
                        </View>
                        {isCurrentBowler && (
                          <Ionicons name="checkmark-circle" size={24} color={colors.selectedBorder} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wide Modal */}
      <Modal
        visible={wideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWideModalVisible(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setWideModalVisible(false)}
        >
          <View style={[styles.extrasModal, { backgroundColor: colors.modalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Wide</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select runs scored + 1 wide</Text>
            <View style={styles.extrasGrid}>
              {[0, 1, 2, 3, 4].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[styles.extrasModalButton, { backgroundColor: colors.extras, borderWidth: 1, borderColor: colors.extrasBorder }]}
                  onPress={() => handleWideWithRuns(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.extrasModalButtonText, { color: colors.textPrimary }]}>{runs}</Text>
                  <Text style={[styles.extrasPreviewText, { color: colors.textSecondary }]}>Wd + {runs}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.gridButton }]}
              onPress={() => setWideModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* No Ball Modal */}
      <Modal
        visible={noBallModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoBallModalVisible(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setNoBallModalVisible(false)}
        >
          <View style={[styles.extrasModal, { backgroundColor: colors.modalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>No Ball</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select runs scored + 1 no ball</Text>
            <View style={styles.extrasGrid}>
              {[0, 1, 2, 3, 4].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[styles.extrasModalButton, { backgroundColor: colors.extras, borderWidth: 1, borderColor: colors.extrasBorder }]}
                  onPress={() => handleNoBallWithRuns(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.extrasModalButtonText, { color: colors.textPrimary }]}>{runs}</Text>
                  <Text style={[styles.extrasPreviewText, { color: colors.textSecondary }]}>Nb + {runs}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.gridButton }]}
              onPress={() => setNoBallModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Bye Modal */}
      <Modal
        visible={byeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setByeModalVisible(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setByeModalVisible(false)}
        >
          <View style={[styles.extrasModal, { backgroundColor: colors.modalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Byes</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select bye runs</Text>
            <View style={styles.extrasGrid}>
              {[1, 2, 3, 4].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[styles.extrasModalButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleByeRuns(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.extrasModalButtonText}>{runs}</Text>
                  <Text style={styles.extrasPreviewText}>{runs} bye{runs > 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.gridButton }]}
              onPress={() => setByeModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Leg Bye Modal */}
      <Modal
        visible={legByeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLegByeModalVisible(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setLegByeModalVisible(false)}
        >
          <View style={[styles.extrasModal, { backgroundColor: colors.modalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Leg Byes</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select leg bye runs</Text>
            <View style={styles.extrasGrid}>
              {[1, 2, 3, 4].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[styles.extrasModalButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleLegByeRuns(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.extrasModalButtonText}>{runs}</Text>
                  <Text style={styles.extrasPreviewText}>{runs} lb</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.gridButton }]}
              onPress={() => setLegByeModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rare Runs Modal (5, 7) */}
      <Modal
        visible={rareRunsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRareRunsModalVisible(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setRareRunsModalVisible(false)}
        >
          <View style={[styles.extrasModal, { backgroundColor: colors.modalBg }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rare Runs</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select rare run totals</Text>
            <View style={styles.rareRunsGrid}>
              {[5, 7].map(runs => (
                <TouchableOpacity
                  key={runs}
                  style={[styles.rareRunButton, { backgroundColor: colors.accent }]}
                  onPress={() => handleRareRuns(runs)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rareRunButtonText}>{runs}</Text>
                  <Text style={styles.extrasPreviewText}>{runs} runs</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.modalCloseButton, { backgroundColor: colors.gridButton }]}
              onPress={() => setRareRunsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCloseButtonText, { color: colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreDisplay: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreDisplayGlow: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  oversValue: {
    fontSize: 20,
  },
  bowlerInfo: {
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bowlerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bowlerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectBowlerText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  inningsCompleteCard: {
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  inningsCompleteText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  startSecondInningsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startSecondInningsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 28,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ballHistorySection: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ballHistoryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  ballHistoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  ballHistoryRecent: {
    // Colors applied inline
  },
  ballHistoryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  runsSection: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 70,
  },
  gridButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  gridButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  gridButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  boundaryButton: {
    // Colors applied inline
  },
  undoButton: {
    // Colors applied inline
  },
  extrasButton: {
    // Colors applied inline
  },
  wicketSection: {
    marginTop: 8,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  extrasSection: {
    marginBottom: 48,
    padding: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fullWidthButton: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  scoreButton: {
    flex: 1,
    minWidth: '22%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  dotButton: {
    // Colors applied inline
  },
  plusButton: {
    // Colors applied inline
  },
  confirmButton: {
    // Colors applied inline
  },
  cancelButton: {
    // Colors applied inline
  },
  pendingRunsContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  pendingRunsText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  addRunsModal: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
  },
  addRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16,
  },
  addRunButton: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addRunButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  addRunPreviewText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  modalCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  extrasModal: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
  },
  extrasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16,
    justifyContent: 'center',
  },
  extrasModalButton: {
    width: 70,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  extrasModalButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  extrasPreviewText: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
  },
  rareRunsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 16,
    justifyContent: 'center',
  },
  rareRunButton: {
    width: 100,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  rareRunButtonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  shortcutsSection: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  shortcutsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  shortcutsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  shortcutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
    borderWidth: 1,
  },
  shortcutButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  scoreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  wicketButton: {
    // Colors applied inline
  },
  ballButton: {
    // Colors applied inline
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  completedText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inningsInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  inningsLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  teamBatting: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  batsmenSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  batsmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  batsmanOnStrike: {
    // Colors applied inline
  },
  batsmanInfo: {
    flex: 1,
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  batsmanStats: {
    fontSize: 14,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  extraButton: {
    // Colors applied inline
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 16,
  },
  playerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  playerSelectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerSelectAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  playerSelectInfo: {
    flex: 1,
  },
  playerSelectName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerSelectUsername: {
    fontSize: 14,
  },
  playerSelectItemSelected: {
    // Colors applied inline
  },
  playerSelectItemOnStrike: {
    // Colors applied inline
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  setupInstructions: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  onStrikeInstructions: {
    fontSize: 14,
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  strikeSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 8,
  },
  strikeSelectItemActive: {
    // Colors applied inline
  },
  strikeSelectName: {
    fontSize: 16,
    fontWeight: '600',
  },
  startInningsButtonContainer: {
    marginTop: 20,
  },
  bowlerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  bowlerSelectItemDisabled: {
    // Colors applied inline
  },
  bowlerSelectItemCurrent: {
    // Colors applied inline
  },
  bowlerStatsText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  rotationRuleText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  disabledText: {
    // Colors applied inline
  },
});
