/**
 * @format
 */

import './src/sentry'; // must be first — initialises Sentry before the app loads
import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
