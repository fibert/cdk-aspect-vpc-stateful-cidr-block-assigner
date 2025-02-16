import * as fs from 'fs';
import * as path from 'path';
import { IAspect, aws_ec2 as ec2 } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

interface SubnetRecord {
  readonly Name: string;
  readonly LogicalId: string;
  AvailabilityZone: string;
  readonly CidrBlock: string;
}

export interface AvailabilityZoneSubstitution {
  readonly source: string;
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

  private freshCidrBlocksAwaitingSubnet: Array<string> = [];
  private subnetsAwaitingFreshCidrBlock: Array<ec2.Subnet> = [];

  private vpcCount: number = 0;
  private disallowedAvailabilityZones: Array<string> = [];

  constructor(props: VpcStatefulCidrBlockAssignerProps) {
    const subnetContextFilePath = this.generateContextFilePath(
      props.vpcId,
      props.contextFileDirectory,
    );
    this.subnetContext = this.readSubnetContextFromFile(subnetContextFilePath);
    this.assignedCiderBlock = this.collectAssignedCidrBlocks(
      this.subnetContext,
    );

    if (typeof props.availabilityZoneSubstitutions !== 'undefined') {
      this.subnetContext = this.applyAvailabilityZoneSubstitution(
        this.subnetContext,
        props.availabilityZoneSubstitutions,
      );
      this.disallowedAvailabilityZones =
        this.collectDisallowedAvailabilityZones(
          props.availabilityZoneSubstitutions,
        );
    }
  }

  private collectAssignedCidrBlocks(
    subnetContext: Array<SubnetRecord>,
  ): Array<string> {
    return subnetContext.map((subnet) => subnet.CidrBlock);
  }
  private collectDisallowedAvailabilityZones(
    availabilityZoneSubstitutions: Array<AvailabilityZoneSubstitution>,
  ): Array<string> {
    return availabilityZoneSubstitutions.map(
      (substitution) => substitution.source,
    );
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

  private generateContextFilePath(
    vpcId: string,
    contextFileDirectory?: string,
  ): string {
    const directoryPath: string =
      typeof contextFileDirectory !== 'undefined'
        ? contextFileDirectory
        : process.cwd();
    const contextFilePath = path.join(
      directoryPath,
      `${vpcId}.subnets.context.json`,
    );
    return contextFilePath;
  }

  private readSubnetContextFromFile(
    subnetContextFilePath: string,
  ): Array<SubnetRecord> {
    let subnetContextJsonString: string;
    let subnetContext: Array<SubnetRecord>;

    try {
      subnetContextJsonString = fs.readFileSync(subnetContextFilePath, 'utf-8');
    } catch (error) {
      console.error(
        `Error reading subnet context file: ${subnetContextFilePath}. Use provided script in README.md to generate.`,
      );
      throw error;
    }

    if (subnetContextJsonString.length == 0) {
      console.error(
        'Subnet context file is empty. Use provided script in README.md to generate.',
      );
      throw new Error('Subnet context file is empty');
    }

    try {
      subnetContext = JSON.parse(
        subnetContextJsonString,
      ) as Array<SubnetRecord>;
    } catch (error) {
      console.error(
        'Error parsing subnet context file. Use provided script in README.md to generate.',
      );
      throw error;
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

    const subnetRecord = this.lookupAssignedSubnetCidrBlock(
      logicalId,
      availabilityZone,
    );

    if (subnetRecord) {
      this.handleExistingSubnet(subnet, subnetRecord);
    } else {
      this.handleNewSubnet(subnet);
    }
  }

  private handleExistingSubnet(
    subnet: ec2.Subnet,
    subnetRecord: SubnetRecord,
  ): void {
    const synthCidrBlock = subnet.ipv4CidrBlock;

    if (this.isFreshCidrBlock(synthCidrBlock)) {
      this.matchFreshCidrBlockWithSubnet(synthCidrBlock);
    }

    // this.setSubnetLogicalId(subnet, subnetRecord.LogicalId);
    // this.setSubnetNameTag(subnet, subnet.node.path);
    this.setSubnetCidrBlock(subnet, subnetRecord.CidrBlock);
  }

  private handleNewSubnet(subnet: ec2.Subnet): void {
    const synthCidrBlock = subnet.ipv4CidrBlock;

    if (!this.isFreshCidrBlock(synthCidrBlock)) {
      this.matchSubnetWithCidrBlock(subnet);
    }
  }

  private setSubnetCidrBlock(subnet: ec2.Subnet, newCidrBlock: string): void {
    const l1Subnet = subnet.node.defaultChild as ec2.CfnSubnet;
    l1Subnet.addPropertyOverride('CidrBlock', newCidrBlock);
  }

  private lookupAssignedSubnetCidrBlock(
    nodeId: string,
    availabilityZone: string,
  ): SubnetRecord | undefined {
    return this.subnetContext
      .filter((subnet) => {
        return (
          nodeId.includes(subnet.Name) &&
          subnet.AvailabilityZone == availabilityZone
        );
      })
      .pop();
  }
  private matchSubnetWithCidrBlock(subnet: ec2.Subnet): void {
    if (this.freshCidrBlocksAwaitingSubnet.length > 0) {
      const freshCidrBlock = this.freshCidrBlocksAwaitingSubnet.pop()!;
      this.setSubnetCidrBlock(subnet, freshCidrBlock);
    } else {
      this.subnetsAwaitingFreshCidrBlock.push(subnet);
    }
  }

  private matchFreshCidrBlockWithSubnet(cidrBlock: string): void {
    if (this.subnetsAwaitingFreshCidrBlock.length > 0) {
      const subnet = this.subnetsAwaitingFreshCidrBlock.pop()!;
      this.setSubnetCidrBlock(subnet, cidrBlock);
    } else {
      this.freshCidrBlocksAwaitingSubnet.push(cidrBlock);
    }
  }

  private isFreshCidrBlock(cidrBlock: string): boolean {
    return !this.assignedCiderBlock.includes(cidrBlock);
  }

  private validateVpc(_vpc: ec2.Vpc): void {
    this.vpcCount++;
    if (this.vpcCount > 1) {
      throw new Error(
        'VpcStatefulCidrBlockAssigner can only be applied to a single VPC',
      );
    }
  }
  private validateSubnet(subnet: ec2.Subnet): void {
    if (this.disallowedAvailabilityZones.includes(subnet.availabilityZone)) {
      throw new Error(
        `Availability Zone ${subnet.availabilityZone} must only appear in one of: Availability Zone in VPC, or as a source of AvailabilityZoneSubstitutions`,
      );
    }
  }
}
