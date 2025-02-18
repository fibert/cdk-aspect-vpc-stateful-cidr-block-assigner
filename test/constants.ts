import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export const ENV: cdk.Environment = { account: '027179758433', region: 'us-east-1' };

export const CIDR_BLOCK = '10.10.0.0/16';

export const AVAILABILITY_ZONES_A_B = ['us-east-1a', 'us-east-1b'];
export const AVAILABILITY_ZONES_A_C = ['us-east-1a', 'us-east-1c'];
export const AVAILABILITY_ZONES_A_B_C = ['us-east-1a', 'us-east-1b', 'us-east-1c'];

export const AZ_SUBSTITUTION_B_C = [{ source: 'us-east-1b', target: 'us-east-1c' }];


export const CONTEXT_FILE_DIRECTORY = 'test/VpcStatefulCidrBlockAssigner/subnet-context-files/';
export const CONTEXT_FILE_VPC_ID = 'test';
export const CONTEXT_FILE_EMPTY_VPC_ID = 'empty';
export const CONTEXT_FILE_CORRUPT_VPC_ID = 'corrupt';
export const CONTEXT_FILE_NON_EXISTENT_VPC_ID = 'nonexistent';

export const SUBNET_PREFIX = 24;
export const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  {
    name: 'public',
    cidrMask: SUBNET_PREFIX,
    subnetType: ec2.SubnetType.PUBLIC,
  },
  {
    name: 'private',
    cidrMask: SUBNET_PREFIX,
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
];
