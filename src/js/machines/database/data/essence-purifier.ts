import { Machine } from "../../logic";

import { ConfiguredMachine, defineMachine } from "../builder";

import { mapRecipesByInput, MetaConfiguredMachine } from "../utils";

import { Currencies } from "@/js/currencies/currencies";

import { MaybeResourceType, Recipe, ResourceType } from "@/types/resources";
import { run } from "@/utils";

const recipes: Recipe<MetaConfiguredMachine<"power", any>>[] = [
	{
		input: { resource: "coal", amount: 0.05 },
		output: { resource: "fire", amount: 0.2 },
		energyUsage: 0.3,
	},
	{
		input: { resource: "energy", amount: 0.15 },
		output: { resource: "essence", amount: 0.5 },
		energyUsage: 0.05,
	},
	{
		input: { resource: "lava", amount: 0.2 },
		output: { resource: "vitriol", amount: 0.08 },
		energyUsage: 0.5,
		isUnlocked: machine => machine.upgrades.power.count > 0,
	},
	{
		input: { resource: "glass", amount: 1 },
		output: { resource: "purity", amount: 0.01 },
		energyUsage: 0.5,
		isUnlocked: machine => machine.upgrades.power.count > 1,
	},
	{
		input: { resource: "none", amount: 0 },
		output: { resource: "earth", amount: 0 },
		energyUsage: 0,
	},
];

const recipesByInput = mapRecipesByInput(recipes);

function getConsumption(machine: ConfiguredMachine<"velocity", { inputResource: MaybeResourceType }>) {
	return (
		(recipesByInput[machine.meta.inputResource || "none"]?.input?.amount ?? 0) * machine.upgrades.velocity.effect
	);
}

function getEnergyUsage(machine: ConfiguredMachine<"velocity", { inputResource: MaybeResourceType }>) {
	return recipesByInput[machine.meta.inputResource || "none"]?.energyUsage ?? 0;
}

function getProduction(machine: MetaConfiguredMachine<"velocity", { inputResource: MaybeResourceType }>) {
	const out = recipesByInput[machine.meta.inputResource || "none"]?.output ?? 0;
	return {
		resource: out.resource,
		amount: out.amount * machine.upgrades.velocity.effect,
	};
}

export default defineMachine({
	name: "essencePurifier",
	meta: () => ({
		inputResource: "none" as MaybeResourceType,
	}),
	inputs: [
		{
			accepts: machine =>
				recipes
					.filter(x => (x.isUnlocked ? run(x.isUnlocked, machine) : true))
					.map(x => x.input.resource)
					.filter(x => x !== "none") as ResourceType[],
			capacity: machine => 5 * machine.upgrades.capacity.effect,
			consumes: machine => {
				const prod = getConsumption(machine);
				return {
					amount: prod,
					maximum: machine.outputDiffs.main * prod,
				};
			},
			isUnlocked: machine => Boolean(machine.upgrades.unlock.effect),
		},
		{
			accepts: ["energy"],
			capacity: machine => 5 * machine.upgrades.capacity.effect,
			consumes: machine => {
				const prod = getEnergyUsage(machine);
				return {
					amount: prod,
					maximum: machine.outputDiffs.main * prod,
				};
			},
			isUnlocked: machine => Boolean(machine.upgrades.unlock.effect),
		},
	],
	outputs: [
		{
			id: "main",
			capacity: machine => 5 * machine.upgrades.capacity.effect,
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
			isUnlocked: machine => Boolean(machine.upgrades.unlock.effect),
		},
	],
	upgrades: {
		unlock: {
			name: "unlock",
			cost: 150,
			currencyType: "energy",
			max: 1,
			title: "Power",
			description: "Supply Power to the EssencePurifier.",
			effect: count => Boolean(count),
			formatEffect: () => "",
			isUnlocked: machine => !machine.upgrades.unlock.effect,
		},
		velocity: {
			name: "velocity",
			cost: count => Math.pow(2.5, count) * 30,
			currencyType: "lava",
			max: 4,
			title: "Efficiency",
			description: "Increase operation speed without increasing energy usage in Input 2",
			effect: count => Math.pow(1.5, count) + count * 0.2,
			isUnlocked: machine => Boolean(machine.upgrades.unlock.effect),
		},
		power: {
			name: "power",
			cost: count => Math.pow(2, count) * 40,
			currencyType: "essence",
			max: 2,
			title: "Very Fine",
			description: "Gain the ability extract essence from 1 more type of raw material",
			effect: count => count,
			formatEffect: () => "",
			isUnlocked: machine => Boolean(machine.upgrades.unlock.effect),
		},
		capacity: {
			name: "capacity",
			cost: count => Math.pow(4, count) * 20,
			max: 2,
			currencyType: "vitriol",
			title: "Capacity",
			description: "Increase capacity",
			effect: count => Math.pow(2, count - 1) + count + 0.5,
			isUnlocked: machine =>
				Boolean(
					machine.upgrades.unlock.effect && (machine.upgrades.power.count || Currencies.vitriol.isUnlocked)
				),
		},
	},
	customLoop(diff) {
		this.meta.inputResource = this.inputItem(0)?.resource ?? "none";
		Machine.tickThisMachine(this, diff);
	},
	description: `Extracts Basic Essences from raw materials.`,
});
