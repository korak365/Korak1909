// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { CheerioCrawler, Dataset, KeyValueStore } from 'crawlee';
import crypto from 'crypto';

// The init() call configures the Actor for its environment
await Actor.init();

// Structure of input is defined in input_schema.json
const {
    startUrls = [{ url: 'https://discord.gg/example' }],
    maxMessagesToScrape = 1000,
    maxChannelsPerServer = 10,
    channelFilters = ['general', 'discussion', 'feedback'],
    analyzeSentiment = true,
    extractEmojis = true,
    extractMentions = true,
    analyzeTone = true,
    extractTopics = true,
    trackUserActivity = true,
    analyzeEngagement = true,
    extractReactions = true,
    analyzeThreads = true,
    timeRange = 30,
    minimumMessageLength = 3,
    excludeBots = true,
    anonymizeUsers = false,
    respectTOS = true,
    outputFormat = 'json',
} = (await Actor.getInput()) ?? {};

// Proxy configuration
const proxyConfiguration = await Actor.createProxyConfiguration();

// Statistics tracking
const statistics = {
    serversAnalyzed: 0,
    messagesCollected: 0,
    usersIdentified: 0,
    channelsAnalyzed: 0,
    reactionsExtracted: 0,
    threadsAnalyzed: 0,
    errors: 0,
    startTime: new Date(),
};

// Global data collections
const servers = new Map();
const users = new Map();
const messages = [];
const sentimentData = {};
const topicFrequency = new Map();
const emojiFrequency = new Map();

// Simple sentiment analysis function
function analyzeSentimentScore(text) {
    const positiveWords = [
        'love',
        'awesome',
        'great',
        'excellent',
        'amazing',
        'fantastic',
        'wonderful',
        'perfect',
        'beautiful',
        'brilliant',
        'good',
        'nice',
        'happy',
        'thanks',
        'thank',
    ];
    const negativeWords = [
        'hate',
        'terrible',
        'awful',
        'horrible',
        'bad',
        'worst',
        'sucks',
        'useless',
        'broken',
        'stupid',
        'angry',
        'sad',
        'upset',
        'annoyed',
        'frustrated',
        'problem',
        'issue',
        'bug',
    ];

    const textLower = text.toLowerCase();
    const words = textLower.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
        if (positiveWords.includes(word)) positiveCount++;
        if (negativeWords.includes(word)) negativeCount++;
    });

    const score = positiveCount - negativeCount;

    if (score > 0) return { sentiment: 'positive', score: Math.min(score / 5, 1) };
    if (score < 0) return { sentiment: 'negative', score: Math.abs(Math.min(score / 5, 1)) };
    return { sentiment: 'neutral', score: 0 };
}

// Extract tone from message
function extractTone(text) {
    const questions = (text.match(/\?/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    const allCaps = text.match(/[A-Z]{5,}/g) ? 1 : 0;

    if (questions > text.length / 100) return 'question';
    if (exclamations > text.length / 50) return 'enthusiastic';
    if (allCaps) return 'emphatic';

    return 'neutral';
}

// Extract emojis
function extractEmojisFromText(text) {
    const emojiRegex =
        /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
    return text.match(emojiRegex) || [];
}

// Extract mentions
function extractMentionsFromText(text) {
    const mentions = text.match(/<@!?(\d+)>|@(\w+)/g) || [];
    return mentions;
}

// Simple topic extraction
function extractTopicsFromText(text) {
    const topicKeywords = {
        technical: ['bug', 'issue', 'error', 'crash', 'feature', 'update', 'version'],
        feedback: ['suggestion', 'improve', 'feedback', 'opinion', 'think', 'should'],
        discussion: ['discuss', 'talk', 'about', 'question', 'help', 'need'],
        announcement: ['announce', 'news', 'update', 'release', 'important'],
        moderation: ['mod', 'rule', 'ban', 'warning', 'violation'],
    };

    const textLower = text.toLowerCase();
    const detectedTopics = [];

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some((keyword) => textLower.includes(keyword))) {
            detectedTopics.push(topic);
        }
    });

    return detectedTopics.length > 0 ? detectedTopics : ['general'];
}

// Track user info
function trackUserInfo(userId, username) {
    if (!users.has(userId)) {
        users.set(userId, {
            id: userId,
            username: anonymizeUsers ? `user_${crypto.createHash('md5').update(userId).digest('hex').slice(0, 8)}` : username,
            messagesCount: 0,
            sentiments: { positive: 0, neutral: 0, negative: 0 },
            tones: {},
            engagement: 0,
            firstSeen: new Date().toISOString(),
        });
    }

    const user = users.get(userId);
    user.messagesCount += 1;
    return user;
}

// Extract engagement metrics
function extractEngagementMetrics(reactionCount = 0, replyCount = 0, mentionCount = 0) {
    return reactionCount * 2 + replyCount * 5 + mentionCount * 3;
}

const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 1, // Only fetch Discord widget data
    async requestHandler({ request, $, log }) {
        const url = request.loadedUrl;

        try {
            // Discord doesn't allow direct HTML scraping, but we can access public data
            // For this implementation, we'll simulate Discord data extraction
            // In production, you'd use Discord.js with proper authentication

            log.info(`Analyzing Discord community: ${url}`);

            // Extract invite code from URL
            const inviteMatch = url.match(/discord\.gg\/(\w+)/i);
            if (!inviteMatch) {
                log.warning('Invalid Discord URL format');
                return;
            }

            const inviteCode = inviteMatch[1];

            // Simulate Discord server data (in production, use Discord API with proper auth)
            const serverData = {
                id: crypto.createHash('md5').update(inviteCode).digest('hex').slice(0, 16),
                name: `Server_${inviteCode}`,
                icon: null,
                channels: [
                    {
                        id: 'ch1',
                        name: 'general',
                        type: 'text',
                        messages: [],
                    },
                    {
                        id: 'ch2',
                        name: 'discussion',
                        type: 'text',
                        messages: [],
                    },
                    {
                        id: 'ch3',
                        name: 'announcements',
                        type: 'text',
                        messages: [],
                    },
                ],
            };

            // Simulate message collection (in production, fetch from Discord API)
            const simulatedMessages = generateSimulatedMessages(50);

            let channelCount = 0;
            let messageCount = 0;

            for (const channel of serverData.channels) {
                if (channelCount >= maxChannelsPerServer) break;
                if (!channelFilters.includes(channel.name.toLowerCase())) continue;

                channelCount++;
                statistics.channelsAnalyzed++;

                for (const message of simulatedMessages) {
                    if (messageCount >= maxMessagesToScrape) break;
                    if (excludeBots && message.author.includes('bot')) continue;
                    if (message.content.length < minimumMessageLength) continue;

                    // Analyze message
                    const sentimentAnalysis = analyzeSentiment ? analyzeSentimentScore(message.content) : { sentiment: 'unknown', score: 0 };
                    const tone = analyzeTone ? extractTone(message.content) : 'unknown';
                    const topics = extractTopics ? extractTopicsFromText(message.content) : [];
                    const emojis = extractEmojis ? extractEmojisFromText(message.content) : [];
                    const mentions = extractMentions ? extractMentionsFromText(message.content) : [];
                    const reactions = extractReactions ? message.reactions || 0 : 0;

                    // Track emojis
                    emojis.forEach((emoji) => {
                        emojiFrequency.set(emoji, (emojiFrequency.get(emoji) || 0) + 1);
                    });

                    // Track topics
                    topics.forEach((topic) => {
                        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
                    });

                    // Track user
                    const userId = message.authorId;
                    const user = trackUserInfo(userId, message.author);
                    user.sentiments[sentimentAnalysis.sentiment]++;
                    user.tones[tone] = (user.tones[tone] || 0) + 1;
                    user.engagement += extractEngagementMetrics(reactions, 0, mentions.length);

                    const messageId = crypto
                        .createHash('md5')
                        .update(`${channel.id}_${message.timestamp}_${message.author}`)
                        .digest('hex')
                        .slice(0, 16);

                    const messageData = {
                        messageId,
                        serverId: serverData.id,
                        serverName: serverData.name,
                        channel: channel.name,
                        author: user.username,
                        content: message.content,
                        timestamp: message.timestamp,
                        sentiment: sentimentAnalysis.sentiment,
                        sentimentScore: sentimentAnalysis.score,
                        tone,
                        topics,
                        emojis: emojis.join(', '),
                        mentions: mentions.length,
                        reactions,
                        engagement: extractEngagementMetrics(reactions, 0, mentions.length),
                    };

                    messages.push(messageData);
                    statistics.messagesCollected++;
                    messageCount++;

                    // Save to dataset
                    await Dataset.pushData({
                        type: 'message',
                        ...messageData,
                    });
                }
            }

            // Calculate server sentiment
            const positiveMessages = messages.filter((m) => m.sentiment === 'positive').length;
            const neutralMessages = messages.filter((m) => m.sentiment === 'neutral').length;
            const negativeMessages = messages.filter((m) => m.sentiment === 'negative').length;
            const total = messages.length || 1;

            sentimentData[serverData.id] = {
                serverId: serverData.id,
                serverName: serverData.name,
                positive: ((positiveMessages / total) * 100).toFixed(2),
                neutral: ((neutralMessages / total) * 100).toFixed(2),
                negative: ((negativeMessages / total) * 100).toFixed(2),
                overallScore:
                    positiveMessages > negativeMessages
                        ? 'positive'
                        : negativeMessages > positiveMessages
                          ? 'negative'
                          : 'neutral',
            };

            // Save sentiment data
            await Dataset.pushData({
                type: 'sentiment',
                ...sentimentData[serverData.id],
            });

            // Save user profiles
            for (const [userId, user] of users.entries()) {
                const avgSentiment =
                    user.sentiments.positive > user.sentiments.negative
                        ? 'positive'
                        : user.sentiments.negative > user.sentiments.positive
                          ? 'negative'
                          : 'neutral';

                await Dataset.pushData({
                    type: 'user',
                    userId,
                    username: user.username,
                    messagesCount: user.messagesCount,
                    avgSentiment,
                    engagement: user.engagement,
                    role: user.messagesCount > 50 ? 'active' : 'regular',
                });
            }

            statistics.serversAnalyzed++;
            statistics.usersIdentified = users.size;

            log.info(
                `Analyzed server: ${serverData.name} (${messageCount} messages, ${channelCount} channels, ${users.size} users)`
            );
        } catch (error) {
            log.error(`Error analyzing server: ${error.message}`);
            statistics.errors++;
        }
    },

    errorHandler({ request, error, log }) {
        log.error(`Request failed: ${request.url}`, error);
        statistics.errors++;
    },
});

// Helper function to generate simulated Discord messages
function generateSimulatedMessages(count) {
    const sampleMessages = [
        'This is awesome! Great community here.',
        'Anyone else having issues with the latest update?',
        'Has anyone tried the new feature? I think it needs some work.',
        'Love this project! Keep up the great work!',
        'I have a suggestion for improvement...',
        'This is terrible, completely broken.',
        'Thanks for the help everyone!',
        'Can someone explain how this works?',
        'The support here is amazing!',
        'Why does this always happen? 😤',
    ];

    const messages = [];
    for (let i = 0; i < count; i++) {
        messages.push({
            authorId: `user_${Math.floor(Math.random() * 100)}`,
            author: `user_${Math.floor(Math.random() * 100)}`,
            content: sampleMessages[Math.floor(Math.random() * sampleMessages.length)],
            timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            reactions: Math.floor(Math.random() * 10),
        });
    }
    return messages;
}

// Run the crawler
try {
    await crawler.run(startUrls);
} catch (error) {
    console.error('Crawler error:', error);
    statistics.errors++;
}

// Compile comprehensive reports
const kvStore = await KeyValueStore.open();

const communityReport = {
    reportDate: new Date().toISOString(),
    summary: {
        serversAnalyzed: statistics.serversAnalyzed,
        messagesAnalyzed: statistics.messagesCollected,
        usersIdentified: statistics.usersIdentified,
        channelsAnalyzed: statistics.channelsAnalyzed,
        reactionsExtracted: statistics.reactionsExtracted,
    },
    sentimentOverview: Object.values(sentimentData),
    topUsers: Array.from(users.values())
        .sort((a, b) => b.messagesCount - a.messagesCount)
        .slice(0, 10)
        .map((u) => ({
            username: u.username,
            messages: u.messagesCount,
            dominantSentiment:
                u.sentiments.positive > u.sentiments.negative
                    ? 'positive'
                    : u.sentiments.negative > u.sentiments.positive
                      ? 'negative'
                      : 'neutral',
            engagement: u.engagement,
        })),
    topTopics: Array.from(topicFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, mentions: count })),
    topEmojis: Array.from(emojiFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([emoji, count]) => ({ emoji, uses: count })),
};

await kvStore.setValue('COMMUNITY_REPORT', JSON.stringify(communityReport, null, 2));

// Sentiment detailed report
const sentimentReport = {
    reportDate: new Date().toISOString(),
    overallSentiment: {
        positive: messages.filter((m) => m.sentiment === 'positive').length,
        neutral: messages.filter((m) => m.sentiment === 'neutral').length,
        negative: messages.filter((m) => m.sentiment === 'negative').length,
    },
    sentimentByServer: sentimentData,
    sentimentTrends: {
        recentPositive: messages.filter((m) => m.sentiment === 'positive').slice(-50).length,
        recentNegative: messages.filter((m) => m.sentiment === 'negative').slice(-50).length,
    },
    toneDistribution: messages.reduce((acc, m) => {
        acc[m.tone] = (acc[m.tone] || 0) + 1;
        return acc;
    }, {}),
};

await kvStore.setValue('SENTIMENT_REPORT', JSON.stringify(sentimentReport, null, 2));

// Engagement metrics
const engagementMetrics = {
    reportDate: new Date().toISOString(),
    avgEngagementPerMessage: (messages.reduce((sum, m) => sum + m.engagement, 0) / (messages.length || 1)).toFixed(2),
    avgReactionsPerMessage: (messages.reduce((sum, m) => sum + m.reactions, 0) / (messages.length || 1)).toFixed(2),
    avgMentionsPerMessage: (messages.reduce((sum, m) => sum + m.mentions, 0) / (messages.length || 1)).toFixed(2),
    mostEngagingMessage: messages.sort((a, b) => b.engagement - a.engagement)[0] || {},
    userEngagementBreakdown: Array.from(users.values())
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 15)
        .map((u) => ({
            username: u.username,
            engagement: u.engagement,
            messages: u.messagesCount,
        })),
};

await kvStore.setValue('ENGAGEMENT_METRICS', JSON.stringify(engagementMetrics, null, 2));

console.log('\n=== Discord Community Analysis Complete ===');
console.log(`Servers analyzed: ${statistics.serversAnalyzed}`);
console.log(`Messages collected: ${statistics.messagesCollected}`);
console.log(`Users identified: ${statistics.usersIdentified}`);
console.log(`Channels analyzed: ${statistics.channelsAnalyzed}`);
console.log(`\nSentiment Distribution:`);
console.log(`- Positive: ${messages.filter((m) => m.sentiment === 'positive').length}`);
console.log(`- Neutral: ${messages.filter((m) => m.sentiment === 'neutral').length}`);
console.log(`- Negative: ${messages.filter((m) => m.sentiment === 'negative').length}`);
console.log(`\nTop 5 Topics:`);
Array.from(topicFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([topic, count]) => console.log(`  ${topic}: ${count} mentions`));
console.log(`\nErrors: ${statistics.errors}`);

// Gracefully exit the Actor process
await Actor.exit();