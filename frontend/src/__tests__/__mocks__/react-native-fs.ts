export default {
  DocumentDirectoryPath: '/mock/documents',
  TemporaryDirectoryPath: '/mock/tmp',
  copyFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  exists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
};
