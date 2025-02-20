import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { SubnetMutator } from './subnetMutator';

export class SubnetCidrBlockMatcher {
  private freshCidrBlocksAwaitingSubnet: Array<string> = [];
  private subnetsAwaitingFreshCidrBlock: Array<ec2.Subnet> = [];

  constructor() {}

  matchSubnetWithCidrBlock(subnet: ec2.Subnet): void {
    const freshCidrBlock: string | undefined = this.freshCidrBlocksAwaitingSubnet.pop();

    if (freshCidrBlock === undefined) {
      this.subnetsAwaitingFreshCidrBlock.push(subnet);
    } else {
      SubnetMutator.setSubnetCidrBlock(subnet, freshCidrBlock);
    }
  }

  matchFreshCidrBlockWithSubnet(cidrBlock: string): void {
    const subnet: ec2.Subnet | undefined = this.subnetsAwaitingFreshCidrBlock.pop();

    if (subnet === undefined) {
      this.freshCidrBlocksAwaitingSubnet.push(cidrBlock);
    } else {
      SubnetMutator.setSubnetCidrBlock(subnet, cidrBlock);
    }
  }
}
