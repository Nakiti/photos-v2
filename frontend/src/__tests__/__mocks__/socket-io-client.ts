const mockSocket = {
  on: jest.fn().mockReturnThis(),
  off: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
  disconnect: jest.fn().mockReturnThis(),
  connect: jest.fn().mockReturnThis(),
  connected: false,
};

export const io = jest.fn().mockReturnValue(mockSocket);
export default io;
