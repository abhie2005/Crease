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
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaHeader } from '@/hooks/useSafeAreaHeader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
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
  const router = useRouter();
  const { headerStyle } = useSafeAreaHeader();

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Match not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if current user is the umpire
  if (!userProfile || match.umpireUid !== userProfile.uid) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unauthorized: You are not the umpire for this match</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
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
    <View style={styles.container}>
      <View style={[styles.header, headerStyle]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Umpire Panel</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        <View style={styles.content}>
          {match.scheduledDate && match.status === 'upcoming' && (
            <CountdownTimer scheduledDate={match.scheduledDate} />
          )}
          <Text style={styles.matchTitle}>
            {match.teamA.name} vs {match.teamB.name}
          </Text>

          {match.battingTeam ? (
            <>
              <View style={styles.scoreDisplay}>
                <Text style={styles.scoreLabel}>Current Score</Text>
                <Text style={styles.scoreValue}>
                  {match.battingTeam === 'teamA' 
                    ? `${match.teamAInnings.runs}/${match.teamAInnings.wickets}`
                    : `${match.teamBInnings.runs}/${match.teamBInnings.wickets}`
                  }
                </Text>
                <Text style={styles.oversValue}>
                  ({match.battingTeam === 'teamA'
                    ? `${match.teamAInnings.overs}.${match.teamAInnings.balls}`
                    : `${match.teamBInnings.overs}.${match.teamBInnings.balls}`
                  } / {match.totalOvers} overs)
                </Text>
              </View>

              {isInningsComplete() && match.currentInnings === 1 && (
                <View style={styles.inningsCompleteCard}>
                  <Text style={styles.inningsCompleteText}>
                    First Innings Complete!
                  </Text>
                  <TouchableOpacity 
                    style={styles.startSecondInningsButton}
                    onPress={() => checkInningsComplete()}
                  >
                    <Text style={styles.startSecondInningsButtonText}>Start 2nd Innings</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.bowlerInfo}>
                <Text style={styles.bowlerLabel}>Current Bowler</Text>
                {(() => {
                  const currentInnings = match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings;
                  const bowlingPlayers = match.battingTeam === 'teamA' ? teamBPlayers : teamAPlayers;
                  
                  if (currentInnings?.currentBowlerUid) {
                    const bowler = bowlingPlayers.find(p => p.uid === currentInnings.currentBowlerUid);
                    const bowlerStats = currentInnings.bowlers?.find(b => b.uid === currentInnings.currentBowlerUid);
                    
                    return (
                      <Text style={styles.bowlerName}>
                        {bowler?.name || 'Unknown'} 
                        {bowlerStats && ` (${bowlerStats.overs}.${bowlerStats.balls} - ${bowlerStats.runs}/${bowlerStats.wickets})`}
                      </Text>
                    );
                  } else {
                    return (
                      <TouchableOpacity onPress={() => setBowlerSelectionModalVisible(true)}>
                        <Text style={styles.selectBowlerText}>Tap to Select Bowler</Text>
                      </TouchableOpacity>
                    );
                  }
                })()}
              </View>
            </>
          ) : (
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreLabel}>Waiting for Toss</Text>
              <Text style={styles.scoreValue}>0/0</Text>
              <Text style={styles.oversValue}>(0.0 overs)</Text>
            </View>
          )}

          {match.status === 'upcoming' && (
            <View style={styles.section}>
              <Button title="Conduct Toss & Start Match" onPress={startMatch} />
            </View>
          )}

          {match.status === 'live' && match.battingTeam && (
            <>
              {/* Innings and Team Info */}
              <View style={styles.inningsInfo}>
                <Text style={styles.inningsLabel}>
                  {match.currentInnings === 1 ? '1st' : '2nd'} Innings  •  Overs: {(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).overs}.{(match.battingTeam === 'teamA' ? match.teamAInnings : match.teamBInnings).balls}/{match.totalOvers}
                </Text>
                <Text style={styles.teamBatting}>
                  {match.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} Batting
                </Text>
                {match.currentInnings === 2 && (
                  <Text style={styles.targetText}>
                    Target: {(match.battingTeam === 'teamA' ? match.teamBInnings.runs : match.teamAInnings.runs) + 1} runs
                  </Text>
                )}
              </View>

              {/* Current Batsmen */}
              {match.currentBatsmen && match.currentBatsmen.length > 0 && (
                <View style={styles.batsmenSection}>
                  <Text style={styles.sectionTitle}>Current Batsmen</Text>
                  {match.currentBatsmen.map((batsman) => {
                    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.uid === batsman.uid);
                    return (
                      <View 
                        key={batsman.uid} 
                        style={[
                          styles.batsmanCard,
                          batsman.isOnStrike && styles.batsmanOnStrike
                        ]}
                      >
                        <View style={styles.batsmanInfo}>
                          <Text style={styles.batsmanName}>
                            {player?.name || 'Unknown'}
                            {batsman.isOnStrike && ' *'}
                          </Text>
                          <Text style={styles.batsmanStats}>
                            {batsman.runs} runs ({batsman.balls} balls)
                          </Text>
                        </View>
                        {batsman.isOnStrike && (
                          <Ionicons name="radio-button-on" size={20} color="#FF9500" />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Runs */}
              <View style={styles.runsSection}>
                <Text style={styles.sectionTitle}>Runs</Text>
                {/* Row 1: Dot, 1, 2 */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.compactButton, styles.dotButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={addDotBall}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>Dot</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.compactButton, (scoring || isInningsComplete() || pendingRuns > 0) && styles.disabledButton]} 
                    onPress={() => handleAccumulateRuns(1)}
                    disabled={scoring || isInningsComplete() || pendingRuns > 0}
                  >
                    <Text style={styles.scoreButtonText}>1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.compactButton, (scoring || isInningsComplete() || pendingRuns > 0) && styles.disabledButton]} 
                    onPress={() => handleAccumulateRuns(2)}
                    disabled={scoring || isInningsComplete() || pendingRuns > 0}
                  >
                    <Text style={styles.scoreButtonText}>2</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Row 2: 4, 6, + */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={[styles.compactButton, (scoring || isInningsComplete() || pendingRuns > 0) && styles.disabledButton]} 
                    onPress={() => handleAccumulateRuns(4)}
                    disabled={scoring || isInningsComplete() || pendingRuns > 0}
                  >
                    <Text style={styles.scoreButtonText}>4</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.compactButton, (scoring || isInningsComplete() || pendingRuns > 0) && styles.disabledButton]} 
                    onPress={() => handleAccumulateRuns(6)}
                    disabled={scoring || isInningsComplete() || pendingRuns > 0}
                  >
                    <Text style={styles.scoreButtonText}>6</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.compactButton, styles.plusButton, (scoring || isInningsComplete() || pendingRuns === 0) && styles.disabledButton]} 
                    onPress={handleOpenAddRunsModal}
                    disabled={scoring || isInningsComplete() || pendingRuns === 0}
                  >
                    <Text style={styles.scoreButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Pending Total Display */}
                {pendingRuns > 0 && (
                  <View style={styles.pendingRunsContainer}>
                    <Text style={styles.pendingRunsText}>{pendingRuns} runs</Text>
                    <View style={styles.pendingActionsRow}>
                      <TouchableOpacity 
                        style={[styles.compactButton, styles.confirmButton, scoring && styles.disabledButton]}
                        onPress={handleScorePendingRuns}
                        disabled={scoring}
                      >
                        <Text style={styles.scoreButtonText}>Score</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.compactButton, styles.cancelButton]}
                        onPress={handleCancelPending}
                      >
                        <Text style={styles.scoreButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Wicket */}
              <View style={styles.wicketSection}>
                <Text style={styles.sectionTitle}>Wicket</Text>
                <TouchableOpacity
                  style={[styles.scoreButton, styles.wicketButton, styles.fullWidthButton, (scoring || isInningsComplete()) && styles.disabledButton]}
                  onPress={handleWicket}
                  disabled={scoring || isInningsComplete()}
                >
                  <Text style={styles.scoreButtonText}>Wicket</Text>
                </TouchableOpacity>
              </View>

              {/* Extras - Wide */}
              <View style={styles.extrasSection}>
                <Text style={styles.sectionTitle}>Wide (1 + extra runs)</Text>
                <View style={styles.buttonGrid}>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addWide(0)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>Wd +0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addWide(1)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>Wd +1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addWide(2)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>Wd +2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addWide(4)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>Wd +4</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Extras - No Ball */}
              <View style={styles.extrasSection}>
                <Text style={styles.sectionTitle}>No Ball (1 + extra runs)</Text>
                <View style={styles.buttonGrid}>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addNoBall(0)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>NB +0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addNoBall(1)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>NB +1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addNoBall(2)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>NB +2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.scoreButton, styles.extraButton, (scoring || isInningsComplete()) && styles.disabledButton]} 
                    onPress={() => addNoBall(4)}
                    disabled={scoring || isInningsComplete()}
                  >
                    <Text style={styles.scoreButtonText}>NB +4</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Button title="Complete Match" onPress={completeMatch} />
              </View>
            </>
          )}

          {match.status === 'completed' && (
            <View style={styles.section}>
              <Text style={styles.completedText}>Match Completed</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select New Batsman</Text>
              <TouchableOpacity onPress={() => setBatsmenModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingPlayers ? (
                <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
              ) : (
                <>
                  {(match?.battingTeam === 'teamA' ? teamAPlayers : teamBPlayers)
                    .filter(player => !(match?.currentBatsmen || []).some(b => b.uid === player.uid))
                    .map((player) => (
                      <TouchableOpacity
                        key={player.uid}
                        style={styles.playerSelectItem}
                        onPress={() => handleSelectNewBatsman(player.uid)}
                      >
                        <View style={styles.playerSelectAvatar}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={styles.playerSelectName}>{player.name}</Text>
                          {player.username && (
                            <Text style={styles.playerSelectUsername}>@{player.username}</Text>
                          )}
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#007AFF" />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>2nd Innings Setup</Text>
                <Text style={styles.modalSubtitle}>
                  {match?.battingTeam === 'teamA' ? match?.teamA.name : match?.teamB.name} to Bat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSecondInningsSetupOpen(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.setupInstructions}>
                Select 2 opening batsmen ({secondInningsBatsmen.length}/2 selected)
              </Text>

              {loadingPlayers ? (
                <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
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
                          isSelected && styles.playerSelectItemSelected,
                          isOnStrike && styles.playerSelectItemOnStrike
                        ]}
                        onPress={() => handleSecondInningsBatsmanSelect(player.uid)}
                      >
                        <View style={styles.playerSelectAvatar}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={styles.playerSelectName}>{player.name}</Text>
                          {player.username && (
                            <Text style={styles.playerSelectUsername}>@{player.username}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {secondInningsBatsmen.length === 2 && (
                    <>
                      <Text style={styles.onStrikeInstructions}>
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
                              secondInningsOnStrike === uid && styles.strikeSelectItemActive
                            ]}
                            onPress={() => setSecondInningsOnStrike(uid)}
                          >
                            <Text style={styles.strikeSelectName}>{player.name}</Text>
                            {secondInningsOnStrike === uid && (
                              <Ionicons name="radio-button-on" size={24} color="#FF9500" />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Bowler</Text>
                <Text style={styles.modalSubtitle}>Choose who will bowl this over</Text>
              </View>
              <TouchableOpacity onPress={() => setBowlerSelectionModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {loadingPlayers ? (
                <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
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
                          isLastBowler && styles.bowlerSelectItemDisabled,
                          isCurrentBowler && styles.bowlerSelectItemCurrent
                        ]}
                        onPress={() => handleSelectBowler(player.uid)}
                        disabled={isLastBowler || selectingBowler}
                      >
                        <View style={styles.playerSelectAvatar}>
                          <Text style={styles.playerSelectAvatarText}>
                            {player.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerSelectInfo}>
                          <Text style={[styles.playerSelectName, isLastBowler && styles.disabledText]}>
                            {player.name}
                          </Text>
                          {player.username && (
                            <Text style={[styles.playerSelectUsername, isLastBowler && styles.disabledText]}>
                              @{player.username}
                            </Text>
                          )}
                          {bowlerStats && (
                            <Text style={styles.bowlerStatsText}>
                              {bowlerStats.overs}.{bowlerStats.balls} overs - {bowlerStats.runs}/{bowlerStats.wickets}
                            </Text>
                          )}
                          {isLastBowler && (
                            <Text style={styles.rotationRuleText}>
                              Cannot bowl consecutive overs
                            </Text>
                          )}
                        </View>
                        {isCurrentBowler && (
                          <Ionicons name="checkmark-circle" size={24} color="#34C759" />
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

      {/* Add Runs Modal */}
      <Modal
        visible={addRunsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPending}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddRunsModalVisible(false)}
        >
          <View style={styles.addRunsModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Extra Runs</Text>
            <View style={styles.addRunsGrid}>
              {[1, 2, 3, 4].map(extra => (
                <TouchableOpacity
                  key={extra}
                  style={styles.addRunButton}
                  onPress={() => handleAddExtraRuns(extra)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addRunButtonText}>+{extra}</Text>
                  <Text style={styles.addRunPreviewText}>
                    Total: {pendingRuns + extra} runs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setAddRunsModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  scrollContent: {
    flex: 1
  },
  content: {
    padding: 16
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333'
  },
  scoreDisplay: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  oversValue: {
    fontSize: 20,
    color: '#666'
  },
  bowlerInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  bowlerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  bowlerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF'
  },
  selectBowlerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9500',
    textDecorationLine: 'underline'
  },
  inningsCompleteCard: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#34C759',
    alignItems: 'center'
  },
  inningsCompleteText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
    marginBottom: 16,
    textAlign: 'center'
  },
  startSecondInningsButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  startSecondInningsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  section: {
    marginBottom: 28,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  runsSection: {
    marginBottom: 64,
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  wicketSection: {
    marginTop: 16,
    marginBottom: 48,
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  extrasSection: {
    marginBottom: 48,
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  fullWidthButton: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '100%'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  scoreButton: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  compactButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56
  },
  dotButton: {
    backgroundColor: '#6B7280'
  },
  plusButton: {
    backgroundColor: '#34C759'
  },
  confirmButton: {
    backgroundColor: '#34C759'
  },
  cancelButton: {
    backgroundColor: '#FF3B30'
  },
  pendingRunsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD700'
  },
  pendingRunsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center'
  },
  addRunsModal: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center'
  },
  addRunsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 16
  },
  addRunButton: {
    width: '47%',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  addRunButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  addRunPreviewText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9
  },
  modalCloseButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalCloseButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600'
  },
  scoreButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  wicketButton: {
    backgroundColor: '#FF3B30'
  },
  ballButton: {
    backgroundColor: '#34C759'
  },
  disabledButton: {
    opacity: 0.5
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center'
  },
  completedText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00AA00',
    textAlign: 'center'
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  inningsInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center'
  },
  inningsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  teamBatting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4
  },
  targetText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600'
  },
  batsmenSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  batsmanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
    backgroundColor: '#f9f9f9'
  },
  batsmanOnStrike: {
    borderColor: '#FF9500',
    backgroundColor: '#fff9f0',
    borderWidth: 2
  },
  batsmanInfo: {
    flex: 1
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  batsmanStats: {
    fontSize: 14,
    color: '#666'
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between'
  },
  extraButton: {
    backgroundColor: '#FF9500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333'
  },
  modalScroll: {
    padding: 16
  },
  playerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  playerSelectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerSelectAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  playerSelectInfo: {
    flex: 1
  },
  playerSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  playerSelectUsername: {
    fontSize: 14,
    color: '#666'
  },
  playerSelectItemSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34C759'
  },
  playerSelectItemOnStrike: {
    backgroundColor: '#fff9f0',
    borderColor: '#FF9500'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  setupInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600'
  },
  onStrikeInstructions: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
    marginBottom: 12,
    fontWeight: '600'
  },
  strikeSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  strikeSelectItemActive: {
    backgroundColor: '#fff9f0',
    borderColor: '#FF9500'
  },
  strikeSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  startInningsButtonContainer: {
    marginTop: 20
  },
  bowlerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  bowlerSelectItemDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6
  },
  bowlerSelectItemCurrent: {
    backgroundColor: '#f0fdf4',
    borderColor: '#34C759'
  },
  bowlerStatsText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4
  },
  rotationRuleText: {
    fontSize: 11,
    color: '#FF3B30',
    fontStyle: 'italic',
    marginTop: 2
  },
  disabledText: {
    color: '#999'
  }
});
