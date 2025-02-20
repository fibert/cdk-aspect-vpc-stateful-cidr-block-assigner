# API Reference <a name="API Reference" id="api-reference"></a>


## Structs <a name="Structs" id="Structs"></a>

### AvailabilityZoneSubstitution <a name="AvailabilityZoneSubstitution" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution"></a>

Represents a mapping between source and target Availability Zones for subnet substitution.

#### Initializer <a name="Initializer" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution.Initializer"></a>

```typescript
import { AvailabilityZoneSubstitution } from '@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner'

const availabilityZoneSubstitution: AvailabilityZoneSubstitution = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution.property.source">source</a></code> | <code>string</code> | The source Availability Zone to substitute from. |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution.property.target">target</a></code> | <code>string</code> | The target Availability Zone to substitute to. |

---

##### `source`<sup>Required</sup> <a name="source" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution.property.source"></a>

```typescript
public readonly source: string;
```

- *Type:* string

The source Availability Zone to substitute from.

All subnets in this AZ must be manually deleted before substitution.

---

*Example*

```typescript
'us-east-1a'
```


##### `target`<sup>Required</sup> <a name="target" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution.property.target"></a>

```typescript
public readonly target: string;
```

- *Type:* string

The target Availability Zone to substitute to.

The source AZ's subnet CIDR blocks will be assigned to subnets in this AZ.

---

*Example*

```typescript
'us-east-1b'
```


### VpcStatefulCidrBlockAssignerProps <a name="VpcStatefulCidrBlockAssignerProps" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps"></a>

#### Initializer <a name="Initializer" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.Initializer"></a>

```typescript
import { VpcStatefulCidrBlockAssignerProps } from '@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner'

const vpcStatefulCidrBlockAssignerProps: VpcStatefulCidrBlockAssignerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.vpcId">vpcId</a></code> | <code>string</code> | The VPC ID for the updated VPC. |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.availabilityZoneSubstitutions">availabilityZoneSubstitutions</a></code> | <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution">AvailabilityZoneSubstitution</a>[]</code> | An optional mapping of Availability Zones to substitute. |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.contextFileDirectory">contextFileDirectory</a></code> | <code>string</code> | An optional directory path for the Subnet context file. |

---

##### `vpcId`<sup>Required</sup> <a name="vpcId" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.vpcId"></a>

```typescript
public readonly vpcId: string;
```

- *Type:* string

The VPC ID for the updated VPC.

This VPC ID will be used to locate the Subnet context file on the filesystem.

---

*Example*

```typescript
'vpc-01234567890abcdef'
```


##### `availabilityZoneSubstitutions`<sup>Optional</sup> <a name="availabilityZoneSubstitutions" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.availabilityZoneSubstitutions"></a>

```typescript
public readonly availabilityZoneSubstitutions: AvailabilityZoneSubstitution[];
```

- *Type:* <a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.AvailabilityZoneSubstitution">AvailabilityZoneSubstitution</a>[]

An optional mapping of Availability Zones to substitute.

Used to assign the source AZ's subnets' CIDR blocks for the target AZ's subnets.
You must first manually delete all VPC subnets in each of the source AZs.

---

*Example*

```typescript
[
  {source: 'us-east-1a', target: 'us-east-1b'},
  {source: 'us-east-1c', target: 'us-east-1d'},
]
```


##### `contextFileDirectory`<sup>Optional</sup> <a name="contextFileDirectory" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps.property.contextFileDirectory"></a>

```typescript
public readonly contextFileDirectory: string;
```

- *Type:* string

An optional directory path for the Subnet context file.

When specifiying `contextFileDirectory`, the Subnet context file will be looked for at `{contextFileDirectory}/{vpcId}.subnets.context.json`

---

*Example*

```typescript
'path/to/context/'
```


## Classes <a name="Classes" id="Classes"></a>

### VpcStatefulCidrBlockAssigner <a name="VpcStatefulCidrBlockAssigner" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner"></a>

- *Implements:* aws-cdk-lib.IAspect

An aspect which can be applied to a VPC to override CIDR blocks of subnets.

This aspect rely on a Subent context file containing an updated data about your deployed VPC structure.
To generate this file, use the script in README.md.
The default location for the Subnet context file is at Current Working Directory.

*Example*

```typescript
const network = Network(...) // Contains exactly one VPC construct

const vpcStatefulCidrBlockAssigner = new VpcStatefulCidrBlockAssigner({
  vpcId: 'vpc-01234567890abcdef'
});
cdk.Aspects.of(network).add(vpcStatefulCidrBlockAssigner, {
  priority: cdk.AspectPriority.MUTATING
});
```


#### Initializers <a name="Initializers" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.Initializer"></a>

```typescript
import { VpcStatefulCidrBlockAssigner } from '@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner'

new VpcStatefulCidrBlockAssigner(props: VpcStatefulCidrBlockAssignerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.Initializer.parameter.props">props</a></code> | <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps">VpcStatefulCidrBlockAssignerProps</a></code> | *No description.* |

---

##### `props`<sup>Required</sup> <a name="props" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.Initializer.parameter.props"></a>

- *Type:* <a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssignerProps">VpcStatefulCidrBlockAssignerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.visit">visit</a></code> | All aspects can visit an IConstruct. |

---

##### `visit` <a name="visit" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.visit"></a>

```typescript
public visit(node: IConstruct): void
```

All aspects can visit an IConstruct.

###### `node`<sup>Required</sup> <a name="node" id="@dfibert/cdk-aspect-vpc-stateful-cidr-block-assigner.VpcStatefulCidrBlockAssigner.visit.parameter.node"></a>

- *Type:* constructs.IConstruct

---





