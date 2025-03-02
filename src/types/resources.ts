/*"earth","water","clay","wood","bricks","stone","coal","steam","energy","fire","essence","sand","glass","lava","stoneDust","vitriol","iron","lead","copper","silver","gold","quicksilver","purity","elixir"*/
export const ResourceTypes = [
	"earth",
	"water",
	"clay",
	"lumber",//wood
	"bricks",
	"stone",
	"coal",
	"steam",
	"plasma",//energy
	"fire",
	"crystal",//essence
	"sand",
	"glass",
	"lava",
	"dust",//stoneDust
	"fuel",//vitriol
	"copper",//iron
	"tin",//lead
	"bronze",//copper
	"iron",//silver
	"thorium",//gold
	"platinum",//quicksilver
	"mithril",//purity
	"elixir",
] as const;

export type ResourceType = typeof ResourceTypes[number];
export type MaybeResourceType = "none" | ResourceType;

export interface ResourceData {
	resource: ResourceType,
	amount: number
}
export interface MaybeResourceData {
	resource: MaybeResourceType,
	amount: number
}

export interface Recipe<Instance = any> {
	input: {
		resource: MaybeResourceType;
		amount: number;
	};
	output: {
		resource: ResourceType;
		amount: number
	};

	energyUsage?: number;
	fuelUsage?: number;
	vitriolUsage?: number;
	waterUsage?: number

	isUnlocked?: (machine: Instance) => boolean;
}
