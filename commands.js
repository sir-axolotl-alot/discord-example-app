import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

// Report bug command
const REPORT_BUG_COMMAND = {
  name: 'report-bug',
  description: 'Report a bug in the bot',
  options: [
    {
      type: 3,
      name: 'description',
      description: 'Describe the bug in detail',
      required: true,
    },
    {
      type: 3,
      name: 'steps',
      description: 'Steps to reproduce the bug',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Request feature command
const REQUEST_FEATURE_COMMAND = {
  name: 'request-feature',
  description: 'Request a new feature for the bot',
  options: [
    {
      type: 3,
      name: 'feature',
      description: 'Describe the feature you want',
      required: true,
    },
    {
      type: 3,
      name: 'reason',
      description: 'Why would this feature be useful?',
      required: true,
    }
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// List bugs command
const LIST_BUGS_COMMAND = {
  name: 'list-bugs',
  description: 'Show all reported bugs',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// List bugs command
const LIST_FEATURES_COMMAND = {
  name: 'list-features',
  description: 'Show all requested features',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [REPORT_BUG_COMMAND, REQUEST_FEATURE_COMMAND, LIST_BUGS_COMMAND, LIST_FEATURES_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
