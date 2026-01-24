import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeToMatch, deleteMatch, updateMatchStatus } from '@/services/matches';
import { getUsersByUids } from '@/services/users';
import { Match } from '@/models/Match';
import { User } from '@/models/User';
import { CountdownTimer } from '@/components/CountdownTimer';
import { Button } from '@/components/Button'; // to start match

export default function MatchDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userProfile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamAPlayers, setTeamAPlayers] = useState<User[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<User[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [teamAExpanded, setTeamAExpanded] = useState(false);
  const [teamBExpanded, setTeamBExpanded] = useState(false);
  const router = useRouter();
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMatch(id, (matchData) => {
      setMatch(matchData);
      setLoading(false);
    });

    return unsubscribe;
  }, [id]);

  // Blinking animation for LIVE status
  useEffect(() => {
    if (match?.status === 'live') {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();
      return () => blinkAnimation.stop();
    } else {
      blinkAnim.setValue(1);
    }
  }, [match?.status, blinkAnim]);

  useEffect(() => {
    if (!match) return;
    
    const fetchPlayers = async () => {
      try {
        console.log('[MatchDetails] Starting player fetch');
        console.log('[MatchDetails] Team A UIDs:', match.teamA.playerUids);
        console.log('[MatchDetails] Team B UIDs:', match.teamB.playerUids);
        
        // Filter out empty strings and ensure we have valid UIDs
        const teamAUids = (match.teamA.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        const teamBUids = (match.teamB.playerUids || []).filter(uid => uid && uid.trim().length > 0);
        
        console.log('[MatchDetails] Filtered Team A UIDs:', teamAUids);
        console.log('[MatchDetails] Filtered Team B UIDs:', teamBUids);
        
        
        setLoadingPlayers(true);
        
        const [playersA, playersB] = await Promise.all([
          teamAUids.length > 0 ? getUsersByUids(teamAUids) : Promise.resolve([]),
          teamBUids.length > 0 ? getUsersByUids(teamBUids) : Promise.resolve([])
        ]);
        
        console.log('[MatchDetails] Players fetched - Team A:', playersA.length, playersA.map(p => ({ uid: p.uid, name: p.name })));
        console.log('[MatchDetails] Players fetched - Team B:', playersB.length, playersB.map(p => ({ uid: p.uid, name: p.name })));
        
        
        setTeamAPlayers(playersA);
        setTeamBPlayers(playersB);
      } catch (error) {
        console.log('[MatchDetails] Error fetching players:', error);
        console.error('Error fetching players:', error);
        setTeamAPlayers([]);
        setTeamBPlayers([]);
      } finally {
        setLoadingPlayers(false);
      }
    };
    
    fetchPlayers();
    // Only re-fetch players when player UIDs change, not when the entire match updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.teamA.playerUids, match?.teamB.playerUids]);

  const isUmpire = match && userProfile && match.umpireUid === userProfile.uid;
  const canManage = userProfile && (userProfile.role === 'admin' || userProfile.role === 'president');

  const handleStartMatch = async () => {
    if (!id) return;
    try {
      setLoading(true);
      await updateMatchStatus(id, 'live');
      Alert.alert('Success', 'Match is now LIVE');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start match');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;


    Alert.alert(
      'Delete Match',
      'Are you sure you want to delete this match? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteMatch(id);
              router.replace('/');
            } catch (error: any) {
              setLoading(false);
              Alert.alert('Error', error.message || 'Failed to delete match');
            }
          }
        }
      ]
    );
  };

  const statusColors = {
    upcoming: '#FFA500',
    live: '#FF0000',
    completed: '#00AA00'
  };

  // Helper function to group ball events into overs
  const groupBallsIntoOvers = (ballEvents: any[]) => {
    const overs: any[][] = [];
    let currentOver: any[] = [];
    let legalBalls = 0;

    ballEvents.forEach((ball) => {
      currentOver.push(ball);
      
      // Wide and no-ball don't count as legal deliveries
      if (!ball.isWide && !ball.isNoBall) {
        legalBalls++;
        
        // Complete over after 6 legal deliveries
        if (legalBalls === 6) {
          overs.push([...currentOver]);
          currentOver = [];
          legalBalls = 0;
        }
      }
    });
    
    // Add incomplete over if exists
    if (currentOver.length > 0) {
      overs.push(currentOver);
    }
    
    return overs;
  };

  // Helper function to get ball color based on ball type
  const getBallColor = (ball: any) => {
    if (ball.isWicket) return '#8B0000';  // Dark red for wicket
    if (ball.isNoBall || ball.isWide) return '#FF0000';  // Red for extras
    if (ball.runs === 6) return '#00AA00';  // Green for six
    if (ball.runs === 4) return '#0066CC';  // Blue for four
    if (ball.runs === 0 || ball.isDot) return '#CCCCCC';  // Gray for dot
    return '#FFB800';  // Yellow/orange for 1-3 runs
  };

  // Helper function to get ball display text
  const getBallText = (ball: any) => {
    if (ball.isWicket) return 'W';
    if (ball.isNoBall) return 'NB';
    if (ball.isWide) return 'WD';
    return ball.runs.toString();
  };

  // Render function for over breakdown
  const renderOverBreakdown = (innings: any, teamName: string) => {
    if (!innings || !innings.ballEvents || innings.ballEvents.length === 0) return null;
    
    const overs = groupBallsIntoOvers(innings.ballEvents);
    
    return (
      <View style={styles.overBreakdownCard}>
        <Text style={styles.overBreakdownTitle}>{teamName} - Ball by Ball</Text>
        <View style={styles.oversListContainer}>
          {overs.map((over, overIndex) => (
            <View key={overIndex} style={styles.overRow}>
              <Text style={styles.overLabel}>Over {overIndex + 1}</Text>
              <View style={styles.ballsRow}>
                {over.map((ball, ballIndex) => (
                  <View 
                    key={ballIndex}
                    style={[
                      styles.ballCircle,
                      { backgroundColor: getBallColor(ball) }
                    ]}
                  >
                    <Text style={styles.ballText}>{getBallText(ball)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#8B0000' }]} />
            <Text style={styles.legendText}>Wicket</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#00AA00' }]} />
            <Text style={styles.legendText}>Six</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#0066CC' }]} />
            <Text style={styles.legendText}>Four</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#FFB800' }]} />
            <Text style={styles.legendText}>1-3</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#CCCCCC' }]} />
            <Text style={styles.legendText}>Dot</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendCircle, { backgroundColor: '#FF0000' }]} />
            <Text style={styles.legendText}>Wide/NB</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTeamCard = (
    teamName: string,
    team: { name: string; playerUids: string[] },
    players: User[],
    expanded: boolean,
    toggleExpanded: () => void
  ) => {
    return (
      <View style={styles.teamCard}>
        <Text style={styles.teamTitle}>{teamName}</Text>
        <Text style={styles.teamName}>{team.name}</Text>
        
        <TouchableOpacity 
          style={styles.playerCountBadge}
          onPress={toggleExpanded}
        >
          <Text style={styles.playerCount}>
            {team.playerUids.length} players
          </Text>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#007AFF" 
          />
        </TouchableOpacity>
        
        {expanded && (
          <View style={styles.playerList}>
            {loadingPlayers ? (
              <ActivityIndicator size="small" color="#007AFF" style={styles.playerLoader} />
            ) : players.length > 0 ? (
              players.map((player) => (
                <TouchableOpacity
                  key={player.uid}
                  style={styles.playerItem}
                  onPress={() => player.username && router.push(`/user/${player.username}`)}
                >
                  <View style={styles.playerAvatar}>
                    <Text style={styles.playerAvatarText}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    {player.username && (
                      <Text style={styles.playerUsername}>@{player.username}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#999" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noPlayersText}>No player data available</Text>
            )}
          </View>
        )}
      </View>
    );
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {match.scheduledDate && match.status === 'upcoming' && (
          <CountdownTimer scheduledDate={match.scheduledDate} />
        )}
        <View style={styles.statusBadgeContainer}>
          {match.status === 'live' ? (
            <Animated.View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[match.status], opacity: blinkAnim }
              ]}
            >
              <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
            </Animated.View>
          ) : (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColors[match.status] }
              ]}
            >
              <Text style={styles.statusText}>{match.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.matchTitle}>
          {match.teamA.name} vs {match.teamB.name}
        </Text>

        {(match.status === 'live' || match.status === 'completed') && (
          <>
            {match.totalOvers && (
              <Text style={styles.matchFormat}>
                {match.totalOvers} Overs Match
                {match.currentInnings && ` • ${match.currentInnings === 1 ? '1st' : '2nd'} Innings`}
              </Text>
            )}

            {/* Target Card for 2nd Innings */}
            {match.currentInnings === 2 && match.status === 'live' && (
              <View style={styles.targetCard}>
                <Text style={styles.targetLabel}>TARGET</Text>
                <Text style={styles.targetValue}>
                  {(match.battingTeam === 'teamA' ? match.teamBInnings.runs : match.teamAInnings.runs) + 1} runs
                </Text>
                <Text style={styles.targetSubtext}>
                  {match.battingTeam === 'teamA' ? match.teamA.name : match.teamB.name} needs {
                    ((match.battingTeam === 'teamA' ? match.teamBInnings.runs : match.teamAInnings.runs) + 1) - 
                    (match.battingTeam === 'teamA' ? match.teamAInnings.runs : match.teamBInnings.runs)
                  } runs to win
                </Text>
              </View>
            )}
            
            {/* Team A Innings Score */}
            {match.teamAInnings && match.teamAInnings.runs > 0 && (
              <View style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>
                  {match.teamA.name} 
                  {match.battingTeam === 'teamA' && match.status === 'live' && ' (Batting)'}
                </Text>
                <Text style={styles.scoreText}>
                  {match.teamAInnings.runs}/{match.teamAInnings.wickets}
                </Text>
                <Text style={styles.oversText}>
                  ({match.teamAInnings.overs}.{match.teamAInnings.balls} / {match.totalOvers} overs)
                </Text>
              </View>
            )}

            {/* Team B Innings Score */}
            {match.teamBInnings && match.teamBInnings.runs > 0 && (
              <View style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>
                  {match.teamB.name}
                  {match.battingTeam === 'teamB' && match.status === 'live' && ' (Batting)'}
                </Text>
                <Text style={styles.scoreText}>
                  {match.teamBInnings.runs}/{match.teamBInnings.wickets}
                </Text>
                <Text style={styles.oversText}>
                  ({match.teamBInnings.overs}.{match.teamBInnings.balls} / {match.totalOvers} overs)
                </Text>
              </View>
            )}

            {/* Current Batsmen */}
            {match.status === 'live' && match.currentBatsmen && match.currentBatsmen.length > 0 && (
              <View style={styles.batsmenCard}>
                <Text style={styles.batsmenTitle}>Current Batsmen</Text>
                <View style={styles.batsmenList}>
                  {match.currentBatsmen.map((batsman: any) => {
                    const player = [...teamAPlayers, ...teamBPlayers].find(p => p.uid === batsman.uid);
                    return (
                      <View key={batsman.uid} style={styles.batsmanItem}>
                        <View style={styles.batsmanInfo}>
                          <Text style={styles.batsmanName}>
                            {player?.name || 'Unknown'} {batsman.isOnStrike && '*'}
                          </Text>
                          {batsman.isOnStrike && (
                            <View style={styles.onStrikeBadge}>
                              <Text style={styles.onStrikeText}>On Strike</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.batsmanScore}>
                          {batsman.runs} ({batsman.balls})
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Over Breakdown for Team A */}
            {(match.status === 'live' || match.status === 'completed') && match.teamAInnings && (
              renderOverBreakdown(match.teamAInnings, match.teamA.name)
            )}

            {/* Over Breakdown for Team B */}
            {(match.status === 'live' || match.status === 'completed') && match.teamBInnings && match.teamBInnings.runs > 0 && (
              renderOverBreakdown(match.teamBInnings, match.teamB.name)
            )}

            {/* Match Result */}
            {match.status === 'completed' && match.teamAInnings && match.teamBInnings && (
              <View style={styles.resultCard}>
                <Text style={styles.resultText}>
                  {(() => {
                    const teamAScore = match.teamAInnings.runs;
                    const teamBScore = match.teamBInnings.runs;
                    
                    if (teamAScore === teamBScore) return 'Match Tied';
                    
                    // Determine which team batted second to calculate wicket margin
                    const teamBattedSecond = match.currentInnings === 2 ? match.battingTeam : 
                      (match.battingTeam === 'teamA' ? 'teamB' : 'teamA');
                    
                    if (teamAScore > teamBScore) {
                      // Team A won
                      if (teamBattedSecond === 'teamB') {
                        // Team B batted second, show runs margin
                        return `${match.teamA.name} won by ${teamAScore - teamBScore} runs`;
                      } else {
                        // Team A batted second, show wickets margin
                        return `${match.teamA.name} won by ${10 - match.teamAInnings.wickets} wickets`;
                      }
                    } else {
                      // Team B won
                      if (teamBattedSecond === 'teamA') {
                        // Team A batted second, show runs margin
                        return `${match.teamB.name} won by ${teamBScore - teamAScore} runs`;
                      } else {
                        // Team B batted second, show wickets margin
                        return `${match.teamB.name} won by ${10 - match.teamBInnings.wickets} wickets`;
                      }
                    }
                  })()}
                </Text>
              </View>
            )}

            {/* Fallback to old score if new innings data not available */}
            {(!match.teamAInnings || (match.teamAInnings.runs === 0 && match.teamBInnings.runs === 0)) && (
              <View style={styles.scoreCard}>
                <Text style={styles.scoreTitle}>Current Score</Text>
                <Text style={styles.scoreText}>
                  {match.score.runs}/{match.score.wickets}
                </Text>
                <Text style={styles.oversText}>
                  ({match.score.overs}.{match.score.balls} overs)
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.teamsContainer}>
          {renderTeamCard(
            "Team A",
            match.teamA,
            teamAPlayers,
            teamAExpanded,
            () => setTeamAExpanded(!teamAExpanded)
          )}
          
          {renderTeamCard(
            "Team B",
            match.teamB,
            teamBPlayers,
            teamBExpanded,
            () => setTeamBExpanded(!teamBExpanded)
          )}
        </View>

        {canManage && match.status === 'upcoming' && (
          <TouchableOpacity
            style={[styles.umpireButton, styles.startButton]}
            onPress={handleStartMatch}
          >
            <Text style={styles.umpireButtonText}>
              🚀 Start Match (Make Live)
            </Text>
          </TouchableOpacity>
        )}

        {isUmpire && match.status !== 'completed' && (
          <TouchableOpacity
            style={styles.umpireButton}
            onPress={() => router.push(`/umpire/${id}`)}
          >
            <Text style={styles.umpireButtonText}>
              🏏 Open Scoring Panel
            </Text>
          </TouchableOpacity>
        )}

        {canManage && (
          <TouchableOpacity
            style={[styles.umpireButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.umpireButtonText}>
              🗑️ Delete Match
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backButton: {
    paddingVertical: 8
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600'
  },
  content: {
    padding: 16
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  matchTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333'
  },
  scoreCard: {
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
  scoreTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  oversText: {
    fontSize: 18,
    color: '#666'
  },
  teamsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24
  },
  teamCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  teamTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  playerCount: {
    fontSize: 14,
    color: '#666'
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 8
  },
  playerList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  playerLoader: {
    paddingVertical: 12
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 8
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  playerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  playerInfo: {
    flex: 1
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  playerUsername: {
    fontSize: 12,
    color: '#666'
  },
  noPlayersText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8
  },
  umpireButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16
  },
  umpireButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  startButton: {
    backgroundColor: '#34C759',
    marginBottom: 16
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    marginTop: 8
  },
  adminInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  adminInfoText: {
    fontSize: 14,
    color: '#666'
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16
  },
  matchFormat: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600'
  },
  resultCard: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24
  },
  resultText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center'
  },
  targetCard: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4
  },
  targetLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  targetValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  targetSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center'
  },
  batsmenCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  batsmenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  batsmenList: {
    gap: 8
  },
  batsmanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  batsmanInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  batsmanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  onStrikeBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  onStrikeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700'
  },
  batsmanScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  overBreakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  overBreakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  oversListContainer: {
    gap: 12
  },
  overRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  overLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
    minWidth: 60
  },
  ballsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap'
  },
  ballCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  ballText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff'
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendCircle: {
    width: 16,
    height: 16,
    borderRadius: 8
  },
  legendText: {
    fontSize: 11,
    color: '#666'
  }
});
