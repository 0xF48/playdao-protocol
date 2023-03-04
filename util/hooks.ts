import { QUERY_DAO, QUERY_QUEST } from './queries';
import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react';
import { useAccount, useContractWrite, usePrepareContractWrite } from 'wagmi'
import playdaoABI from '../contracts/graph/abis/PlayDAO.json'
import { useSigner } from 'wagmi'
import _ from 'lodash'
import { ethers } from 'ethers'
import { useNetwork } from 'wagmi'
import { claimQuest } from './contracts/playdao'

export function useLocalStorage<T>(key: string, fallbackValue: T) {
	const [value, setValue] = useState(fallbackValue);

	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue] as const;
}


function questRequirementsMet(quest: any, dao: any) {

}

export function extractQuestAndQuestType(questId: string, dao: any) {
	if (!dao) return [null, null]
	var found_quest = null
	var found_quest_type = null
	dao.questTypes.forEach((questType: any) => {
		questType.quests.forEach((quest: any) => {
			if (quest.questID == questId) {
				found_quest = quest
				found_quest_type = questType
			}
		})
	})

	return [found_quest, found_quest_type]
}


export function PLAYDAOGlobals() {
	// const { chain, chains } = useNetwork()
	// return {
	// 	GRAPH_API: process.env.NEXT_PUBLIC_BASE_GRAPH,
	// 	BADGE_CONTRACT: process.env.NEXT_PUBLIC_BASE_BADGE,
	// 	DAO_CONTRACT: process.env.NEXT_PUBLIC_BASE_CONTRACT,
	// 	// ATTESTATION: process.env.NEXT_PUBLIC_BASE_ATTESTATION,
	// 	chainId: 1,
	// }

	return {
		GRAPH_API: process.env.NEXT_PUBLIC_OPTIMISM_GRAPH,
		BADGE_CONTRACT: process.env.NEXT_PUBLIC_OPTIMISM_BADGE,
		DAO_CONTRACT: process.env.NEXT_PUBLIC_OPTIMISM_PLAYDAO,
		ATTESTATION: process.env.NEXT_PUBLIC_OPTIMISM_ATTESTATION,
		chainId: 1,
	}
}

export function useClaimQuest(quest_id?: any, dao_id?: any, requiredStake?: any) {

	const { address, isConnecting, isDisconnected } = useAccount()
	const { data: signer } = useSigner()

	const [claim_id, setClaimId]: any = useState(undefined)
	const [error, setError]: any = useState()
	const [is_loading, setIsLoading]: any = useState(false)

	async function doClaimQuest() {
		var claim_id = null
		setIsLoading(true)
		if (signer) {
			try {
				claim_id = await claimQuest(signer, String(PLAYDAOGlobals().DAO_CONTRACT), dao_id, quest_id, requiredStake)
			} catch (error) {
				setError(error)
			}
			setIsLoading(false)
			setClaimId(claim_id)
		}
	}

	return {
		loading: is_loading,
		claim_id: claim_id,
		error: error,
		claimQuest: doClaimQuest
	}
}


export function useQuest(quest_id?: any) {

	const { data: org_data, loading: org_loading, error: org_error } = useOrganization()
	const { address, isConnecting, isDisconnected } = useAccount()

	var found_quest: any = null
	var found_quest_type = null

	if (org_data) {
		org_data.dao.questTypes.forEach((questType: any) => {
			questType.quests.forEach((quest: any) => {
				if (quest.questID == quest_id) {
					found_quest = quest
					found_quest_type = questType
				}
			})
		})
	}

	if (org_loading || isConnecting) {
		return {
			quest_loading: true,
			quest: found_quest,
			quest_type: found_quest_type,
			quest_error: null,
		}
	}

	if (isDisconnected) {
		return {
			quest_error: new Error('is disconnected')
		}
	}

	if (org_data) {

		org_data.dao.questTypes.forEach((questType: any) => {
			questType.quests.forEach((quest: any) => {
				if (quest.id == quest_id) {
					found_quest = quest
					found_quest_type = questType
				}
			})
		})

		if (!found_quest) {
			return {
				quest_loading: false,
				quest: null,
				quest_error: new Error('quest not found'),
			}
		} else {
			return {
				quest_loading: false,
				quest: found_quest,
				quest_type: found_quest_type,
				quest_error: null,
			}
		}
	}

	return {
		quest_loading: true,
		quest: found_quest,
		quest_type: found_quest_type,
		quest_error: null,
	}

}

export function useOrganization(id?: any) {
	let [stored_id, setStoredId] = useState("")

	useEffect(() => {
		var got_id = id
		if (!got_id) {
			got_id = window.localStorage.getItem('daoID');
		} else {
			localStorage.setItem('daoID', got_id)
		}
		setStoredId(String(got_id))
	}, [id]);

	const { data, loading, error } = useQuery(QUERY_DAO, {
		variables: {
			id: stored_id,
		},
	});

	// console.log(data?.dao)

	if (!stored_id) {
		return { data: null, loading: false, error: new Error('scan another persons DAO QR to get started') }
	}

	return { data, loading, error };
}