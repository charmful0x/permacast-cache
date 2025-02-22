import { arweave, readContract } from "./arweave.js";
import { BLACKLIST, MASKING_CONTRACT } from "./constants/blacklist.js";
import { V2_V3_ARRAY } from "./constants/v2_v3_conversion.js";
import { gqlTemplate, permacastDeepGraphs } from "./gql.js";
import base64url from "base64url";

export async function getFactoriesObjects() {
  const factories = [];
  const factoriesObjects = await gqlTemplate(permacastDeepGraphs.factories);

  for (let factory of factoriesObjects) {
    factories.push({
      id: factory.id,
      owner: factory.owner,
      timestamp: factory.timestamp,
    });
  }

  return factories;
}

async function blacklistFactoryPodcast(state) {
  // blacklist a podcast based on its pid
  // remove the podcast object from the factory's
  // state and return the new state if blacklist
  // was found
  let blacklistedPodcastsArray = (await getStateOf(MASKING_CONTRACT))?.podcasts;

  if (!blacklistedPodcastsArray) {
    blacklistedPodcastsArray = BLACKLIST.podcasts;
  }
  const blacklistedPodcasts = state.podcasts.filter(
    (podObj) =>
      blacklistedPodcastsArray.includes(podObj.pid) || !podObj.isVisible
  );

  if (blacklistedPodcasts.length > 0) {
    const filteredPodcasts = state.podcasts.filter(
      (pod) => !blacklistedPodcasts.includes(pod) || pod.isVisible
    );

    state.podcasts = filteredPodcasts;
    return state;
  }

  return state;
}

export async function getFactoriesState() {
  const factoriesObj = await getFactoriesObjects();
  const states = [];
  for (let factory of factoriesObj) {
    console.log(factory);
    const v2Possibility = V2_V3_ARRAY.findIndex((f) => f.new === factory.id);
    console.log(v2Possibility);
    const unfiliteredState = await getStateOf(factory.id);

    if (v2Possibility !== -1) {
      console.log("\n\n\n\n\n\n\nADDED A NEW CHILD\n\n\n\n\n\n\n");
      unfiliteredState.podcasts.forEach(
        (podcast) => (podcast.newChildOf = V2_V3_ARRAY[v2Possibility].new)
      );
    }

    // set factory metadata
    if (unfiliteredState) {
      const state = await blacklistFactoryPodcast(unfiliteredState);

      state.factory_id = factory.id;
      state.owner = factory.owner;
      state.factoryCreationTimestamp = factory.timestamp;
      states.push(state);
    }
  }

  const response = {
    res: states,
  };
  return base64url(JSON.stringify(response));
}

export async function getStateOf(contractId) {
  // const contract = smartweave.contract(contractId);
  // const contractState = (await contract.readState()).state;
  try {
    const contractState = await readContract(contractId);

    return contractState;
  } catch (error) {
    console.log(error);
    console.log(`SMARTWEAVE ERROR: ${error.name} : ${error.description}`);
    return false;
  }
}
