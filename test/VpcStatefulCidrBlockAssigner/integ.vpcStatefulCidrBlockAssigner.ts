import * as path from "path";
import { IntegTest, ExpectedResult, Match } from "@aws-cdk/integ-tests-alpha";
import * as cdk from "aws-cdk-lib";
import { aws_ec2 as ec2 } from "aws-cdk-lib";
import { IConstruct } from "constructs";
import { VpcStatefulCidrBlockAssigner } from "../../src/vpcStatefulCidrBlockAssigner";

const SUBNET_CONTEXT_FILE_DIRECTORY = path.join(__dirname, "subnet-context-files");

const REGION = process.env["AWS_REGION"] || "us-east-1";
const CIDR_BLOCK = "10.1.0.0/16";

const SUBNET_CONFIGURATION: Array<ec2.SubnetConfiguration> = [
  { name: "public", cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  { name: "private", cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
];
const AZ_SUFFIXES_A_B_C = ["a", "b", "c"];

const TAG_KEY_INTEG_TEST_NAME = "IntegTestName";

interface IntegTestStackProps extends cdk.StackProps {
  cidrBlock: string;
  availabilityZonesSuffixes: Array<string>;
  subnetConfiguration: Array<ec2.SubnetConfiguration>;
  IntegTestName: string;
}

export class IntegTestStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;

  constructor(scope: IConstruct, id: string, props: IntegTestStackProps) {
    super(scope, id, props);

    const availabilityZones = props.availabilityZonesSuffixes.map((azSuffix) => `${REGION}${azSuffix}`);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(props.cidrBlock),
      availabilityZones: availabilityZones,
      subnetConfiguration: props.subnetConfiguration,
    });

    cdk.Tags.of(this.vpc).add(TAG_KEY_INTEG_TEST_NAME, props.IntegTestName);
  }
}

function applyVpcStatefulCidrBlockAssigner(stack: IntegTestStack): void {
  const vpcId = `integ.${REGION}`;
  console.log(vpcId);
  const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
    vpcId: vpcId,
    contextFileDirectory: SUBNET_CONTEXT_FILE_DIRECTORY,
  });
  cdk.Aspects.of(stack.vpc).add(vpcStatefulCidrBlockAssigner, {
    priority: cdk.AspectPriority.MUTATING,
  });
}

// Test definition

// Given
const app = new cdk.App();

const appendAzTestName = "AppendAz";
const appendAzTestNameTag = appendAzTestName;
const appendAzStack = new IntegTestStack(app, `IntegTest${appendAzTestName}Stack`, {
  cidrBlock: CIDR_BLOCK,
  availabilityZonesSuffixes: AZ_SUFFIXES_A_B_C,
  subnetConfiguration: SUBNET_CONFIGURATION,
  IntegTestName: appendAzTestNameTag,
});
applyVpcStatefulCidrBlockAssigner(appendAzStack);

const integ = new IntegTest(app, "IntegTest", {
  testCases: [appendAzStack],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
});

// When
const AZ_A = `${REGION}a`;
const AZ_B = `${REGION}b`;
const AZ_C = `${REGION}c`;

const subnetsAzA = integ.assertions.awsApiCall("EC2", "DescribeSubnets", {
  Filters: [
    { Name: `tag:${TAG_KEY_INTEG_TEST_NAME}`, Values: [appendAzTestNameTag] },
    { Name: "availability-zone", Values: [AZ_A] },
  ],
});

const subnetsAzB = integ.assertions.awsApiCall("EC2", "DescribeSubnets", {
  Filters: [
    { Name: `tag:${TAG_KEY_INTEG_TEST_NAME}`, Values: [appendAzTestNameTag] },
    { Name: "availability-zone", Values: [AZ_B] },
  ],
});

const subnetsAzC = integ.assertions.awsApiCall("EC2", "DescribeSubnets", {
  Filters: [
    { Name: `tag:${TAG_KEY_INTEG_TEST_NAME}`, Values: [appendAzTestNameTag] },
    { Name: "availability-zone", Values: [AZ_C] },
  ],
});

// Then
subnetsAzA.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_A, CidrBlock: "10.1.0.0/24" })]),
  })
);
subnetsAzA.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_A, CidrBlock: "10.1.2.0/24" })]),
  })
);

subnetsAzB.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_B, CidrBlock: "10.1.1.0/24" })]),
  })
);
subnetsAzB.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_B, CidrBlock: "10.1.3.0/24" })]),
  })
);

subnetsAzC.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_C, CidrBlock: "10.1.4.0/24" })]),
  })
);
subnetsAzC.expect(
  ExpectedResult.objectLike({
    Subnets: Match.arrayWith([Match.objectLike({ AvailabilityZone: AZ_C, CidrBlock: "10.1.5.0/24" })]),
  })
);
