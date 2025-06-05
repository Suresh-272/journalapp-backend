// Simple emotion analysis based on keywords
const emotions = {
  happy: ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'good', 'love', 'smile', 'laugh'],
  sad: ['sad', 'unhappy', 'depressed', 'down', 'miserable', 'upset', 'cry', 'tears', 'heartbroken'],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'rage', 'hate'],
  anxious: ['anxious', 'worried', 'nervous', 'stress', 'tense', 'fear', 'scared', 'panic'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'content', 'quiet', 'still'],
  excited: ['excited', 'thrilled', 'eager', 'enthusiastic', 'energetic', 'pumped', 'psyched']
};

/**
 * Analyze text for emotional content
 * @param {string} text - The text to analyze
 * @returns {string} - The detected emotion or 'neutral' if none detected
 */
exports.analyzeEmotion = (text) => {
  if (!text) return 'neutral';
  
  const lowercaseText = text.toLowerCase();
  const words = lowercaseText.match(/\b(\w+)\b/g) || [];
  
  const emotionScores = {};
  
  // Initialize scores
  Object.keys(emotions).forEach(emotion => {
    emotionScores[emotion] = 0;
  });
  
  // Count emotion keywords
  words.forEach(word => {
    Object.keys(emotions).forEach(emotion => {
      if (emotions[emotion].includes(word)) {
        emotionScores[emotion]++;
      }
    });
  });
  
  // Find the emotion with the highest score
  let maxEmotion = 'neutral';
  let maxScore = 0;
  
  Object.keys(emotionScores).forEach(emotion => {
    if (emotionScores[emotion] > maxScore) {
      maxScore = emotionScores[emotion];
      maxEmotion = emotion;
    }
  });
  
  // Return neutral if no significant emotion detected
  return maxScore > 0 ? maxEmotion : 'neutral';
};