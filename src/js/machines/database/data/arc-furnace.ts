import { ConfiguredMachine, defineMachine } from "../builder";
import { Machine } from "../../logic";
import { mapRecipesByInput } from "../utils";

import { MaybeResourceType, Recipe, ResourceType } from "@/types/resources";
import { run } from "@/utils";

const metals = ["iron", "lead", "copper", "silver", "gold", "quicksilver"];

const recipes: Recipe[] = [
	{
		input: { resource: "clay", amount: 0.1 },
		output: { resource: "bricks", amount: 1 },
		energyUsage: 0.02,
	},
	{
		input: { resource: "water", amount: 0.15 },
		output: { resource: "steam", amount: 1.5 },
		energyUsage: 0.04,
	},
	{
		input: { resource: "sand", amount: 0.1 },
		output: { resource: "glass", amount: 0.7 },
		energyUsage: 0.06,
	},
	{
		input: { resource: "stone", amount: 0.25 },
		output: { resource: "lava", amount: 2.0 },
		energyUsage: 0.15,
	},
	{
		input: { resource: "none", amount: 0 },
		output: { resource: "earth", amount: 0 },
		energyUsage: 0,
	},
];

const recipesByInput = mapRecipesByInput(recipes);

function getConsumption(
	machine: ConfiguredMachine<"velocity", { inputResource: MaybeResourceType; catalystActive: boolean }>
) {
	return (
		recipesByInput[machine.meta.inputResource || "none"].input.amount *
		(machine.meta.catalystActive ? 1.6 : 1) *
		machine.upgrades.velocity.effect
	);
}

function getEnergyUsage(machine: ConfiguredMachine<"velocity", { inputResource: MaybeResourceType }>) {
	return (
		(recipesByInput[machine.meta.inputResource || "none"]?.energyUsage ?? 0) *
		Math.sqrt(machine.upgrades.velocity.effect as number)
	);
}

function getProduction(
	machine: ConfiguredMachine<"velocity", { inputResource: MaybeResourceType; catalystActive: boolean }>
) {
	const out = recipesByInput[machine.meta.inputResource || "none"].output;
	return {
		resource: out.resource,
		amount: out.amount * (machine.meta.catalystActive ? 1.6 : 1) * machine.upgrades.velocity.effect,
	};
}

export default defineMachine({
	name: "arcFurnace",
	meta: () => ({
		inputResource: "none" as MaybeResourceType,
		catalystActive: false,
	}),
	inputs: [
		{
			accepts: machine =>
				recipes
					.filter(x => (x.isUnlocked ? run(x.isUnlocked, machine) : true))
					.map(x => x.input.resource)
					.filter(x => x !== "none") as ResourceType[],
			capacity: () => 40,
			consumes: machine => {
				const prod = getConsumption(machine);
				return {
					amount: prod,
					maximum: machine.outputDiffs.main * prod,
				};
			},
		},
		{
			accepts: ["energy"],
			capacity: () => 40,
			consumes: machine => {
				const prod = getEnergyUsage(machine);
				return {
					amount: prod,
					maximum: machine.outputDiffs.main * prod,
				};
			},
		},
		{
			accepts: ["fire"],
			capacity: () => 40,
			consumes: () => 0.01,
			label: "Catalyst\n(5 Fire)",
			isUnlocked: machine => Boolean(machine.upgrades.cat.effect),
		},
	],
	outputs: [
		{
			id: "main",
			capacity: () => 40,
			produces: machine => getProduction(machine),
			requiresList: machine => [
				{
					resource: machine.meta.inputResource || "none",
					amount: getConsumption(machine),
					inputId: 0,
				},
				{
					resource: "energy",
					amount: getEnergyUsage(machine),
					inputId: 1,
				},
			],
		},
	],
	upgrades: {
		cat: {
			name: "cat",
			cost: 25,
			currencyType: "lava",
			max: 1,
			title: "Catalysis",
			description: "Allows insertion of Fire for increased efficiency.",
			effect: count => Boolean(count),
			formatEffect: () => "",
		},
		velocity: {
			name: "velocity",
			cost: 4,
			currencyType: count => metals[count] as ResourceType,
			max: 5,
			title: "Plater",
			description: "Increase operation speed but only increases Energy usage at sqrt the rate",
			effect: count => Math.pow(1.3, count),
		},
		powah: {
			name: "powah",
			cost: 60,
			currencyType: "energy",
			max: 40,
			title: "Powah",
			description: "Increase operation speed",
			// effect: count => Math.pow(1.3, count),
			effect: count => [Math.pow(1.5, count) + count * 0.5, Math.pow(1.1, count) + count * 0.2],
			formatEffect: () => "",
		},
	},
	customLoop(diff) {
		this.meta.inputResource = this.inputItem(0)?.resource ?? "none";
		this.meta.catalystActive = (this.inputItem(2)?.amount ?? 0) >= 5;
		Machine.tickThisMachine(this, diff);
	},
	description: `The Arc Furnace is more powerful than the Basic Furnace. Takes Energy to use.`,
});
