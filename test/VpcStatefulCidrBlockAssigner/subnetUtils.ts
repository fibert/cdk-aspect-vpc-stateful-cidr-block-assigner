import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SubnetRecord } from '../../src/vpcStatefulCidrBlockAssigner';

export class SubnetUtils {
  public static getSubnetRecordsFromStack(stack: cdk.Stack): SubnetRecord[] {
    const template = Template.fromStack(stack);
    const subnets = template.findResources('AWS::EC2::Subnet');
    return this.generateSubnetRecordsArray(subnets);
  }

  public static calculateConfilictingSubnets(first: SubnetRecord[], second: SubnetRecord[]): SubnetRecord[] {
    return first.filter((firstSubnetRecord) => {
      for (const secondSubnetRecord of second) {
        if (this.isConflicting(firstSubnetRecord, secondSubnetRecord)) {
          return true;
        }
      }
      return false;
    });
  }

  public static isConflicting(first: SubnetRecord, second: SubnetRecord): boolean {
    return (
      first.CidrBlock === second.CidrBlock &&
      !(first.AvailabilityZone === second.AvailabilityZone && first.Name === first.Name)
    );
  }

  public static generateSubnetRecordsArray(subnets: {
    [key: string]: {
      [key: string]: any;
    };
  }): SubnetRecord[] {
    return Object.values(subnets).map((subnet) => {
      const name = subnet.Properties.Tags.filter(
        (tag: { Key: string; Value: string }) => tag.Key === 'aws-cdk:subnet-name',
      )[0].Value;

      return {
        Name: name,
        AvailabilityZone: subnet.Properties.AvailabilityZone,
        CidrBlock: subnet.Properties.CidrBlock,
      } as SubnetRecord;
    });
  }
}
