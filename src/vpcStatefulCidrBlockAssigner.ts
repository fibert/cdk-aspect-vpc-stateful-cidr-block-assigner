import * as fs from 'fs';
import * as path from 'path';
import { IAspect, aws_ec2 as ec2 } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import * as errors from './errors';
import { SubnetCidrBlockMatcher } from './subnetCidrBlockMatcher';
import { SubnetMutator } from './subnetMutator';

/**
 * Represents a subnet record with its properties
 */
export interface SubnetRecord {
  /**
   * The name identifier of the subnet
   */
  readonly Name: string;

  /**
   * The Availability Zone where the subnet is located
   * Can be modified when applying AZ substitutions
   */
  AvailabilityZone: string;

  /**
   * The CIDR block range assigned to the subnet
   */
  readonly CidrBlock: string;
}

/**
 * Represents a mapping between source and target Availability Zones for subnet substitution
 */
export interface AvailabilityZoneSubstitution {
  /**
   * The source Availability Zone to substitute from.
   * All subnets in this AZ must be manually deleted before substitution.
   * @example 'us-east-1a'
   */
  readonly source: string;

  /**
   * The target Availability Zone to substitute to.
   * The source AZ's subnet CIDR blocks will be assigned to subnets in this AZ.
   * @example 'us-east-1b'
   */
  readonly target: string;
}

export interface VpcStatefulCidrBlockAssignerProps {
  /**
   * The VPC ID for the updated VPC.
   * This VPC ID will be used to locate the Subnet context file on the filesystem.
   *
   * @example
   * 'vpc-01234567890abcdef'
   */
  readonly vpcId: string;

  /**
   * An optional directory path for the Subnet context file.
   * When specifiying `contextFileDirectory`, the Subnet context file will be looked for at `{contextFileDirectory}/{vpcId}.subnets.context.json`
   *
   * @example
   * 'path/to/context/'
   */
  readonly contextFileDirectory?: string; // TODO: Test

  /**
   * An optional mapping of Availability Zones to substitute.
   * Used to assign the source AZ's subnets' CIDR blocks for the target AZ's subnets.
   * You must first manually delete all VPC subnets in each of the source AZs.
   *
   * @throws Error if a source Availability Zone is found in the VPC
   *
   * @example
   * [
   *   {source: 'us-east-1a', target: 'us-east-1b'},
   *   {source: 'us-east-1c', target: 'us-east-1d'},
   * ]
   */
  readonly availabilityZoneSubstitutions?: Array<AvailabilityZoneSubstitution>;
}

/**
 * An aspect which can be applied to a VPC to override CIDR blocks of subnets.
 * This aspect rely on a Subent context file containing an updated data about your deployed VPC structure.
 * To generate this file, use the script in README.md.
 * The default location for the Subnet context file is at Current Working Directory.
 *
 * @example
 *
 * const network = Network(...) // Contains exactly one VPC construct
 *
 * const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
 *   vpcId: 'vpc-01234567890abcdef'
 * });
 * cdk.Aspects.of(network).add(vpcStatefulCidrBlockAssigner, {
 *   priority: cdk.AspectPriority.MUTATING
 * });
 */
export class VpcStatefulCidrBlockAssigner implements IAspect {
  private subnetContext: Array<SubnetRecord>;
  private assignedCiderBlock: Array<string>;

  private subnetCidrBlockMatcher = new SubnetCidrBlockMatcher();

  private vpcCount: number = 0;
  private disallowedAvailabilityZones: Array<string> = [];

  constructor(props: VpcStatefulCidrBlockAssignerProps) {
    const subnetContextFilePath = this.generateContextFilePath(props.vpcId, props.contextFileDirectory);
    this.subnetContext = this.readSubnetContextFromFile(subnetContextFilePath);
    this.assignedCiderBlock = this.collectAssignedCidrBlocks(this.subnetContext);

    if (typeof props.availabilityZoneSubstitutions !== 'undefined') {
      this.subnetContext = this.applyAvailabilityZoneSubstitution(
        this.subnetContext,
        props.availabilityZoneSubstitutions,
      );
      this.disallowedAvailabilityZones = this.collectDisallowedAvailabilityZones(
        props.availabilityZoneSubstitutions,
      );
    }
  }

  private collectAssignedCidrBlocks(subnetContext: Array<SubnetRecord>): Array<string> {
    return subnetContext.map((subnet) => subnet.CidrBlock);
  }
  private collectDisallowedAvailabilityZones(
    availabilityZoneSubstitutions: Array<AvailabilityZoneSubstitution>,
  ): Array<string> {
    return availabilityZoneSubstitutions.map((substitution) => substitution.source);
  }

  private applyAvailabilityZoneSubstitution(
    subnetContext: Array<SubnetRecord>,
    availabilityZoneSubstitutions: Array<AvailabilityZoneSubstitution>,
  ): Array<SubnetRecord> {
    const newSubnetContext = subnetContext.map((subnet) => {
      availabilityZoneSubstitutions.forEach((substitution) => {
        if (subnet.AvailabilityZone === substitution.source) {
          subnet.AvailabilityZone = substitution.target;
        }
      });
      return subnet;
    });

    return newSubnetContext;
  }

  private generateContextFilePath(vpcId: string, contextFileDirectory?: string): string {
    const directoryPath: string =
      typeof contextFileDirectory !== 'undefined' ? contextFileDirectory : process.cwd();
    const contextFilePath = path.join(directoryPath, `${vpcId}.subnets.context.json`);
    return contextFilePath;
  }

  private readSubnetContextFromFile(subnetContextFilePath: string): Array<SubnetRecord> {
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

  visit(node: IConstruct): void {
    if (node instanceof ec2.Vpc) {
      this.validateVpc(node as ec2.Vpc);
      return;
    }

    if (!(node instanceof ec2.Subnet)) {
      return;
    }

    const subnet = node as ec2.Subnet;
    this.validateSubnet(subnet);

    const logicalId = subnet.node.id;
    const availabilityZone = subnet.availabilityZone;

    const subnetRecord = this.lookupAssignedSubnetCidrBlock(logicalId, availabilityZone);

    if (subnetRecord) {
      this.handleExistingSubnet(subnet, subnetRecord);
    } else {
      this.handleNewSubnet(subnet);
    }
  }

  private handleExistingSubnet(subnet: ec2.Subnet, subnetRecord: SubnetRecord): void {
    const synthCidrBlock = subnet.ipv4CidrBlock;

    if (this.isFreshCidrBlock(synthCidrBlock)) {
      this.subnetCidrBlockMatcher.matchFreshCidrBlockWithSubnet(synthCidrBlock);
    }

    SubnetMutator.setSubnetCidrBlock(subnet, subnetRecord.CidrBlock);
  }

  private handleNewSubnet(subnet: ec2.Subnet): void {
    const synthCidrBlock = subnet.ipv4CidrBlock;

    if (!this.isFreshCidrBlock(synthCidrBlock)) {
      this.subnetCidrBlockMatcher.matchSubnetWithCidrBlock(subnet);
    }
  }

  private lookupAssignedSubnetCidrBlock(nodeId: string, availabilityZone: string): SubnetRecord | undefined {
    return this.subnetContext
      .filter((subnet) => {
        return nodeId.includes(subnet.Name) && subnet.AvailabilityZone == availabilityZone;
      })
      .pop();
  }

  private isFreshCidrBlock(cidrBlock: string): boolean {
    return !this.assignedCiderBlock.includes(cidrBlock);
  }

  private validateVpc(_vpc: ec2.Vpc): void {
    this.vpcCount++;
    if (this.vpcCount > 1) {
      throw errors.MULTIPLE_VPCS;
    }
  }
  private validateSubnet(subnet: ec2.Subnet): void {
    if (this.disallowedAvailabilityZones.includes(subnet.availabilityZone)) {
      throw errors.AZ_IN_BOTH_VPC_AND_SUBSTITUTION;
    }
  }
}
