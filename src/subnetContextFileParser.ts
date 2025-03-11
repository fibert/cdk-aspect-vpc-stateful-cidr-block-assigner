import * as fs from 'fs';
import * as path from 'path';
import * as errors from './errors';
import { SubnetRecord } from './vpcStatefulCidrBlockAssigner';

export class SubnetsContextFileParser {
  /**
   * Parses a subnet context file and returns an array of subnet records
   * @param vpcId The ID of the VPC to parse subnet context for
   * @param contextFileDirectory Optional directory path where the context file is located. Defaults to current working directory
   * @returns Array of subnet records parsed from the context file
   */
  public static parse(vpcId: string, contextFileDirectory?: string): Array<SubnetRecord> {
    const contextFilePath = SubnetsContextFileParser.generateContextFilePath(vpcId, contextFileDirectory);
    return SubnetsContextFileParser.readSubnetContextFromFile(contextFilePath);
  }

  private static generateContextFilePath(vpcId: string, contextFileDirectory?: string): string {
    const directoryPath: string =
      typeof contextFileDirectory !== 'undefined' ? contextFileDirectory : process.cwd();
    const contextFilePath = path.join(directoryPath, `${vpcId}.subnets.context.json`);
    return contextFilePath;
  }

  private static readSubnetContextFromFile(subnetContextFilePath: string): Array<SubnetRecord> {
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