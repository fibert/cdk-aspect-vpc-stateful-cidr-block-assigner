import * as fs from 'fs';
import * as path from 'path';
import * as errors from './errors';
import { SubnetRecord } from './vpcStatefulCidrBlockAssigner';

export class SubnetContextFileReader {
  /**
   * Generates the path to the subnet context file for a given VPC ID
   */
  public generateContextFilePath(vpcId: string, contextFileDirectory?: string): string {
    const directoryPath: string =
      typeof contextFileDirectory !== 'undefined' ? contextFileDirectory : process.cwd();
    const contextFilePath = path.join(directoryPath, `${vpcId}.subnets.context.json`);
    return contextFilePath;
  }

  /**
   * Reads and parses the subnet context from a file
   */
  public readSubnetContextFromFile(subnetContextFilePath: string): Array<SubnetRecord> {
    let subnetContextJsonString: string;
    let subnetContext: Array<SubnetRecord>;

    if (!fs.existsSync(subnetContextFilePath)) {
      throw errors.SUBNET_CONTEXT_FILE_DOES_NOT_EXIST;
    }

    try {
      subnetContextJsonString = fs.readFileSync(subnetContextFilePath, 'utf-8');
    } catch (error) {
      throw errors.READING_SUBNET_CONTEXT_FILE;
    }

    if (subnetContextJsonString.length == 0) {
      throw errors.EMPTY_SUBNET_CONTEXT_FILE;
    }

    try {
      subnetContext = JSON.parse(subnetContextJsonString) as Array<SubnetRecord>;
    } catch (error) {
      throw errors.PARSING_SUBNET_CONTEXT_FILE;
    }

    return subnetContext;
  }
}