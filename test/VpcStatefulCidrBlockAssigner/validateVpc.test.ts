import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import * as errors from '../../src/errors';
import { VpcStatefulCidrBlockAssigner } from '../../src/vpcStatefulCidrBlockAssigner';
import * as constants from '../constants';

interface TestStackProps extends cdk.StackProps {
  availabilityZones: Array<string>;
  subnetConfiguration: Array<ec2.SubnetConfiguration>;
}

class testNetwork extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    new ec2.Vpc(this, 'Vpc1');
    new ec2.Vpc(this, 'Vpc2');
  }
}

class TestStack extends cdk.Stack {
  readonly network: testNetwork;
  constructor(scope: Construct, id: string, props: TestStackProps) {
    super(scope, id, props);
    this.network = new testNetwork(this, 'Network');
  }
}

describe('test validating VPC', () => {
  test('when applying to construct with multiple VPCs should throw error', () => {
    // Given

    // When
    const testApp = new cdk.App();
    const testStack = new TestStack(testApp, 'MultiVpcStack', {
      env: constants.ENV,
      availabilityZones: constants.AVAILABILITY_ZONES_A_B,
      subnetConfiguration: constants.SUBNET_CONFIGURATION,
    });
    const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
      vpcId: constants.CONTEXT_FILE_VPC_ID,
      contextFileDirectory: constants.CONTEXT_FILE_DIRECTORY,
    });
    cdk.Aspects.of(testStack.network).add(vpcStatefulCidrBlockAssigner, {
      priority: cdk.AspectPriority.MUTATING,
    });

    // Then
    expect(() => {
      Template.fromStack(testStack);
    }).toThrow(errors.MULTIPLE_VPCS);
  });
});
