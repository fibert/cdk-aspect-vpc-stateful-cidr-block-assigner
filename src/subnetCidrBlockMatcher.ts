import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { SubnetManager } from './subnetManager';

export class SubnetCidrBlockMatcher {
  private freshCidrBlocksAwaitingSubnet: Array<string> = [];
  private subnetsAwaitingFreshCidrBlock: Array<ec2.Subnet> = [];

  constructor() {}

  matchSubnetWithCidrBlock(subnet: ec2.Subnet): void {
    if (this.freshCidrBlocksAwaitingSubnet.length > 0) {
      const freshCidrBlock = this.freshCidrBlocksAwaitingSubnet.pop()!;
      SubnetManager.setSubnetCidrBlock(subnet, freshCidrBlock);
    } else {
      this.subnetsAwaitingFreshCidrBlock.push(subnet);
    }
  }

  matchFreshCidrBlockWithSubnet(cidrBlock: string): void {
    if (this.subnetsAwaitingFreshCidrBlock.length > 0) {
      const subnet = this.subnetsAwaitingFreshCidrBlock.pop()!;
      SubnetManager.setSubnetCidrBlock(subnet, cidrBlock);
    } else {
      this.freshCidrBlocksAwaitingSubnet.push(cidrBlock);
    }
  }
}
