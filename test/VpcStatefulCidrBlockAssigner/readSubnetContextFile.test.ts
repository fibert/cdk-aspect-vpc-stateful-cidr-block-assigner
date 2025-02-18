import * as fs from 'fs';
import * as path from 'path';
import * as errors from '../../src/errors';
import { VpcStatefulCidrBlockAssigner } from '../../src/vpcStatefulCidrBlockAssigner';
import * as constants from '../constants';

describe('test reading subnet context files', () => {
  test('when non existent in current working directory should throw error', () => {
    // Given
    const filePath = path.join(
      process.cwd(),
      `${constants.CONTEXT_FILE_NON_EXISTENT_VPC_ID}.subnet.context.json`,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // When
    const constructVpcStatefulCidrBlockAssigner = () => {
      new VpcStatefulCidrBlockAssigner({
        vpcId: constants.CONTEXT_FILE_NON_EXISTENT_VPC_ID,
      });
    };

    // Then
    expect(constructVpcStatefulCidrBlockAssigner).toThrow(errors.SUBNET_CONTEXT_FILE_DOES_NOT_EXIST);
  });

  test('when non existent in contextFileDirectory should throw error', () => {
    // Given
    const filePath = path.join(
      process.cwd(),
      constants.CONTEXT_FILE_DIRECTORY,
      `${constants.CONTEXT_FILE_NON_EXISTENT_VPC_ID}.subnet.context.json`,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // When
    const constructVpcStatefulCidrBlockAssigner = () => {
      new VpcStatefulCidrBlockAssigner({
        vpcId: constants.CONTEXT_FILE_NON_EXISTENT_VPC_ID,
        contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      });
    };

    // Then
    expect(constructVpcStatefulCidrBlockAssigner).toThrow(errors.SUBNET_CONTEXT_FILE_DOES_NOT_EXIST);
  });

  test('when empty should throw error', () => {
    // Given

    // When
    const constructVpcStatefulCidrBlockAssigner = () => {
      new VpcStatefulCidrBlockAssigner({
        vpcId: constants.CONTEXT_FILE_EMPTY_VPC_ID,
        contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      });
    };

    // Then
    expect(constructVpcStatefulCidrBlockAssigner).toThrow(errors.EMPTY_SUBNET_CONTEXT_FILE);
  });

  test('when corrupt should throw error', () => {
    // Given

    // When
    const constructVpcStatefulCidrBlockAssigner = () => {
      new VpcStatefulCidrBlockAssigner({
        vpcId: constants.CONTEXT_FILE_CORRUPT_VPC_ID,
        contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      });
    };

    // Then
    expect(constructVpcStatefulCidrBlockAssigner).toThrow(errors.PARSING_SUBNET_CONTEXT_FILE);
  });

  test('when valid and existent in contextFileDirectory should not throw error', () => {
    // Given

    // When
    const constructVpcStatefulCidrBlockAssigner = () => {
      new VpcStatefulCidrBlockAssigner({
        vpcId: constants.CONTEXT_FILE_VPC_ID,
        contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
      });
    };

    // Then
    expect(constructVpcStatefulCidrBlockAssigner).not.toThrow();
  });
});
