module.exports = {
  preset: 'react-native',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    // Allow WatermelonDB and its dependencies to be transformed by Babel
    'node_modules/(?!(react-native|@react-native|@nozbe/watermelondb|react-native-.*)/)',
  ],
  moduleNameMapper: {
    'react-native-fs': '<rootDir>/src/__tests__/__mocks__/react-native-fs.ts',
    'react-native-image-resizer': '<rootDir>/src/__tests__/__mocks__/react-native-image-resizer.ts',
    '@react-native-community/netinfo': '<rootDir>/src/__tests__/__mocks__/netinfo.ts',
    'socket\\.io-client': '<rootDir>/src/__tests__/__mocks__/socket-io-client.ts',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  testEnvironment: 'node',
  forceExit: true,
};
