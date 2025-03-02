import { reactive, toRaw } from "vue";

import { fixMachineData, PlayerType } from "@/js/player-type";
import { Towns, TownType } from "@/js/towns";

import { Currencies } from "./currencies/currencies";
import { initializeMachines } from "@/js/machines";
import { MachineData } from "@/js/machines/database/config";
import { migrations } from "@/js/migrations";
import { Modals } from "@/js/ui/modals";

import { deepAssign, downloadAsFile, mapObjectValues } from "@/utils";

// https://github.com/microsoft/TypeScript/issues/31816#issuecomment-593069149
type FileEventTarget = EventTarget & { files: FileList };
type FileEvent = Event & { target: FileEventTarget };

export const Player = {
	// Default Player Start - Edit these values for testing if required
	defaultStart(): PlayerType {
		return {
			money: 0,
			towns: {
				home: {
					machines: Towns("home").defaultMachines,
					upgrades: 0,
					machinesPrepay: Towns("home").defaultMachinesPrepay,
					upgradesPrepay: Towns("home").defaultUpgradesPrepay,
					display: {
						offset: { x: 0, y: 0 },
						zoom: 1
					},
				}
			},
			currentlyIn: "home",
			holding: {
				resource: "earth",
				amount: 0
			},
			unlockedCurrencies: mapObjectValues(Currencies, () => false),
			fastTime: 0,
			lastUpdateTime: Date.now(),
			migrations: migrations.length,
			producedElixir: 0,
			finishedEndCutscene: false,
			vitalMarker: Player.storageKey,
			options: {
				autosave: 1,
				exportCount: 0,
				showGridlines: 1,
				snapToGrid: 1,
				minimap: 1,
			}
		};
	},
	// Original storagekey: igj2022-scarlet-summer-alterhistorian2
	storageKey: "the-third-zuluhistorian",
	load(playerObj?: any) {
		Object.assign(player, Player.defaultStart());
		if (playerObj) {
			this.loadAndMigrateSave(playerObj);
		}
		this.fixMachines();
		initializeMachines();
		player.fastTime += (Date.now() - player.lastUpdateTime) / 1000;
		player.lastUpdateTime = Date.now();
	},
	loadAndMigrateSave(playerObj: any) {
		deepAssign(player, playerObj);
		// Reassign machines due to
		for (const T in player.towns) {
			const town = T as TownType;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			player.towns[town].machines = playerObj.towns[town].machines as MachineData[];
		}
		for (; player.migrations < migrations.length; player.migrations++) {
			migrations[player.migrations](player);
		}
	},
	loadSave() {
		try {
			const save = localStorage.getItem(this.storageKey);
			this.load(save ? JSON.parse(save) : undefined);
		} catch {
			this.load();
			Modals.message.showText(`
			The game is unable to save, possibly because you are in incognito. Please export your save
			manually before closing the game.
			`);
		}
	},
	savePlayer() {
		if (player.vitalMarker !== Player.storageKey) return;
		localStorage.setItem(this.storageKey, JSON.stringify(toRaw(player)));
	},
	fixMachines() {
		for (const T in player.towns) {
			const town = T as TownType;
			for (const machineId in player.towns[town].machines) {
				const machine = player.towns[town].machines[machineId];
				fixMachineData(machine);
			}
			const defaultMachines = Towns(town).defaultMachines;
			for (const defaultMachine of Object.values(defaultMachines)) {
				if (Object.values(player.towns[town].machines)
					.find(x => x.type === defaultMachine.type && x.isDefault)) {
					continue;
				}
				let i = 0;
				if (!player.towns[town].machines[i]) {
					player.towns[town].machines[i] = defaultMachine;
					continue;
				}
				while (player.towns[town].machines[i]) {
					i++;
					if (!player.towns[town].machines[i]) {
						player.towns[town].machines[i] = defaultMachine;
						break;
					}
				}
			}
		}
	},
	reset() {
		Player.load();
		Player.savePlayer();
	},
	exportSave() {
		const dateString = `${new Date(Date.now() - (new Date().getTimezoneOffset() * 60 * 1000))
			.toISOString().split("T")[0]} ${new Date().toLocaleTimeString(undefined, { hour12: false })}`;
		player.options.exportCount++;
		downloadAsFile(
			`Alterhistorian Save #${player.options.exportCount} (${dateString})`,
			window.btoa(JSON.stringify(toRaw(player)))
		);
	},
	importSave(event: FileEvent) {
		// This happens if the file dialog is canceled instead of a file being selected
		if (event.target.files.length === 0) return;

		const reader = new FileReader();
		reader.onload = function() {
			let text = reader.result;
			if (typeof text !== "string") {
				Modals.message.showText("Invalid savefile format.");
				return;
			}
			try {
				text = window.atob(text);
			} catch {
				Modals.message.showText("Invalid savefile format.");
				return;
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const playerObj = JSON.parse(text);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (typeof playerObj !== "object" || playerObj.vitalMarker !== Player.storageKey) {
				Modals.message.showText("Invalid savefile format.");
				return;
			}
			Player.load(playerObj);
			Player.savePlayer();
		};
		reader.readAsText(event.target.files[0]);
	}
};

export const player = reactive<PlayerType>({} as PlayerType);

if (/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/u.test(location.href) || location.href.includes("localhost")) {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	window.player = player;
}

setTimeout(() => Player.loadSave(), 0);

window.saveInterval = setInterval(() => {
	if (player.options.autosave) Player.savePlayer();
}, 10000);
