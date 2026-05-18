export default {
  fetch: jest.fn().mockResolvedValue({ type: 'wifi', isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(jest.fn()),
  useNetInfo: jest.fn().mockReturnValue({ type: 'wifi', isConnected: true }),
};
