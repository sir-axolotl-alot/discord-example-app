import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';
import { saveBugReport, saveFeatureRequest, getBugReports, getFeatureRequests, upvoteBug, upvoteFeature } from './database.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
// To keep track of our active games
const activeGames = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "report-bug" command
    if (name === 'report-bug') {
      const description = data.options[0].value;
      const steps = data.options[1].value;
      const userId = req.body.member.user.id;
      const username = req.body.member.user.username;

      try {
        // Save to CSV
        const result = await saveBugReport(userId, username, description, steps);

        if (result.isDuplicate) {
          // Format similar bugs into a message
          const similarBugsList = result.similarEntries.map(bug => {
            const date = new Date(bug.created_at).toLocaleDateString();
            return `**#${bug.id}** (${bug.upvotes} upvotes)\n` +
                   `Reported by: ${bug.username} (<@${bug.user_id}>)\n` +
                   `Date: ${date}\n` +
                   `Description: ${bug.description.replace(/;/g, ',')}\n` +
                   `Steps: ${bug.steps.replace(/;/g, ',')}\n`;
          }).join('\n');

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `⚠️ **Similar bugs already reported!**\n\nWe found similar bugs that might match your report. Please check them out and upvote if they match your issue:\n\n${similarBugsList}\n\nIf none of these match your issue, please try reporting again with more specific details.`,
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW,
                  components: result.similarEntries.map(bug => ({
                    type: MessageComponentTypes.BUTTON,
                    custom_id: `upvote_bug_${bug.id}`,
                    label: `Upvote Bug #${bug.id}`,
                    style: ButtonStyleTypes.SUCCESS,
                  })),
                },
              ],
            },
          });
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🐛 **Bug Report #${result.id}**\n\n**Reported by:** ${username} (<@${userId}>)\n\n**Description:**\n${description}\n\n**Steps to Reproduce:**\n${steps}\n\n✅ Bug report has been saved to our database.`,
          },
        });
      } catch (error) {
        console.error('Error saving bug report:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Sorry, there was an error saving your bug report. Please try again later.`,
          },
        });
      }
    }

    // "request-feature" command
    if (name === 'request-feature') {
      const feature = data.options[0].value;
      const reason = data.options[1].value;
      const userId = req.body.member.user.id;
      const username = req.body.member.user.username;

      try {
        // Save to CSV
        const result = await saveFeatureRequest(userId, username, feature, reason);

        if (result.isDuplicate) {
          // Format similar features into a message
          const similarFeaturesList = result.similarEntries.map(feature => {
            const date = new Date(feature.created_at).toLocaleDateString();
            return `**#${feature.id}** (${feature.upvotes} upvotes)\n` +
                   `Requested by: ${feature.username} (<@${feature.user_id}>)\n` +
                   `Date: ${date}\n` +
                   `Feature: ${feature.feature.replace(/;/g, ',')}\n` +
                   `Reason: ${feature.reason.replace(/;/g, ',')}\n`;
          }).join('\n');

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `⚠️ **Similar features already requested!**\n\nWe found similar features that might match your request. Please check them out and upvote if they match your idea:\n\n${similarFeaturesList}\n\nIf none of these match your request, please try submitting again with more specific details.`,
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW,
                  components: result.similarEntries.map(feature => ({
                    type: MessageComponentTypes.BUTTON,
                    custom_id: `upvote_feature_${feature.id}`,
                    label: `Upvote Feature #${feature.id}`,
                    style: ButtonStyleTypes.SUCCESS,
                  })),
                },
              ],
            },
          });
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `💡 **Feature Request #${result.id}**\n\n**Requested by:** ${username} (<@${userId}>)\n\n**Feature:**\n${feature}\n\n**Reason:**\n${reason}\n\n✅ Feature request has been saved to our database.`,
          },
        });
      } catch (error) {
        console.error('Error saving feature request:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Sorry, there was an error saving your feature request. Please try again later.`,
          },
        });
      }
    }

    // "list-bugs" command
    if (name === 'list-bugs') {
      try {
        const bugs = await getBugReports();
        
        if (bugs.length === 0) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '📝 No bugs have been reported yet.',
            },
          });
        }

        // Format bugs into a nice message
        const bugList = bugs.map(bug => {
          const date = new Date(bug.created_at).toLocaleDateString();
          return `**#${bug.id}** - ${bug.status.toUpperCase()} (${bug.upvotes} upvotes)\n` +
                 `Reported by: ${bug.username} (<@${bug.user_id}>)\n` +
                 `Date: ${date}\n` +
                 `Description: ${bug.description.replace(/;/g, ',')}\n` +
                 `Steps: ${bug.steps.replace(/;/g, ',')}\n`;
        }).join('\n');

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `🐛 **Bug Reports**\n\n${bugList}`,
          },
        });
      } catch (error) {
        console.error('Error fetching bug reports:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Sorry, there was an error fetching bug reports. Please try again later.',
          },
        });
      }
    }

    // "list-features" command
    if (name === 'list-features') {
      try {
        const features = await getFeatureRequests();
        
        if (features.length === 0) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '📝 No feature requests have been submitted yet.',
            },
          });
        }

        // Format features into a nice message
        const featureList = features.map(feature => {
          const date = new Date(feature.created_at).toLocaleDateString();
          return `**#${feature.id}** - ${feature.status.toUpperCase()} (${feature.upvotes} upvotes)\n` +
                 `Requested by: ${feature.username} (<@${feature.user_id}>)\n` +
                 `Date: ${date}\n` +
                 `Feature: ${feature.feature.replace(/;/g, ',')}\n` +
                 `Reason: ${feature.reason.replace(/;/g, ',')}\n`;
        }).join('\n');

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `💡 **Feature Requests**\n\n${featureList}`,
          },
        });
      } catch (error) {
        console.error('Error fetching feature requests:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Sorry, there was an error fetching feature requests. Please try again later.',
          },
        });
      }
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  // Handle upvote buttons
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;
    
    if (componentId.startsWith('upvote_bug_')) {
      const bugId = componentId.replace('upvote_bug_', '');
      try {
        const success = await upvoteBug(bugId);
        if (success) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Upvoted bug #${bugId}!`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      } catch (error) {
        console.error('Error upvoting bug:', error);
      }
    } else if (componentId.startsWith('upvote_feature_')) {
      const featureId = componentId.replace('upvote_feature_', '');
      try {
        const success = await upvoteFeature(featureId);
        if (success) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Upvoted feature #${featureId}!`,
              flags: InteractionResponseFlags.EPHEMERAL,
            },
          });
        }
      } catch (error) {
        console.error('Error upvoting feature:', error);
      }
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
