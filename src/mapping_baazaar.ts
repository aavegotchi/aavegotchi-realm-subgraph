import { ERC721Listing } from "../generated/schema";
import { BIGINT_ONE, BIGINT_ZERO } from "./constants";
import { BigInt, ethereum, log, Address } from "@graphprotocol/graph-ts";
import {
  ERC721ExecutedListing,
  ERC721ListingAdd,
  ERC721ListingCancelled,
  ERC721ListingRemoved,
} from "../generated/AavegotchiBaazaar/Baazaar";
import { getOrCreateParcel } from "./helper";
import { Baazaar } from "../generated/AavegotchiBaazaar/Baazaar";

export function getOrCreateERC721Listing(
  id: string,
  createIfNotFound: boolean = true
): ERC721Listing {
  let listing = ERC721Listing.load(id);

  if (listing == null && createIfNotFound) {
    listing = new ERC721Listing(id);
    listing.blockCreated = BIGINT_ZERO;
    listing.timeCreated = BIGINT_ZERO;
  }

  return listing as ERC721Listing;
}

export function updateERC721ListingInfo(
  listing: ERC721Listing,
  listingID: BigInt,
  event: ethereum.Event
): ERC721Listing {
  let contract = Baazaar.bind(event.address);
  let response = contract.try_getERC721Listing(listingID);

  if (!response.reverted) {
    let listingInfo = response.value;
    listing.category = listingInfo.category;
    listing.erc721TokenAddress = listingInfo.erc721TokenAddress;
    listing.tokenId = listingInfo.erc721TokenId;
    listing.seller = listingInfo.seller;
    listing.timeCreated = listingInfo.timeCreated;
    listing.timePurchased = listingInfo.timePurchased;
    listing.priceInWei = listingInfo.priceInWei;
    listing.cancelled = listingInfo.cancelled;

    if (listing.blockCreated.equals(BIGINT_ZERO)) {
      listing.blockCreated = event.block.number;
    }

    //Update parcel-specific info
  } else {
    log.warning("Listing {} couldn't be updated at block: {} tx_hash: {}", [
      listingID.toString(),
      event.block.number.toString(),
      event.transaction.hash.toHexString(),
    ]);
  }

  return listing as ERC721Listing;
}

export function handleERC721ListingAdd(event: ERC721ListingAdd): void {
  let listing = getOrCreateERC721Listing(event.params.listingId.toString());
  listing = updateERC721ListingInfo(listing, event.params.listingId, event);

  if (listing.category == BigInt.fromI32(4)) {
    listing.parcel = event.params.erc721TokenId.toString();
  }

  listing.save();
}

export function handleERC721ExecutedListing(
  event: ERC721ExecutedListing
): void {
  //Only handle REALM
  if (event.params.category == BigInt.fromI32(4)) {
    let listing = getOrCreateERC721Listing(event.params.listingId.toString());
    listing = updateERC721ListingInfo(listing, event.params.listingId, event);

    listing.buyer = event.params.buyer;
    listing.timePurchased = event.params.time;
    listing.save();

    //Parcel -- update number of times traded

    let parcel = getOrCreateParcel(
      event.params.erc721TokenId,
      event.params.buyer,
      Address.fromHexString(
        event.params.erc721TokenAddress.toHexString()
      ) as Address
    );
    parcel.timesTraded = parcel.timesTraded.plus(BIGINT_ONE);

    // add to historical prices
    let historicalPrices = parcel.historicalPrices;
    historicalPrices.push(event.params.priceInWei);
    parcel.historicalPrices = historicalPrices;
    parcel.save();
  }

  /*
  let stats = getStatisticEntity();
  stats.erc721TotalVolume = stats.erc721TotalVolume.plus(
    event.params.priceInWei
  );
  stats.save();
  */
}

export function handleERC721ListingCancelled(
  event: ERC721ListingCancelled
): void {
  let listing = getOrCreateERC721Listing(event.params.listingId.toString());
  listing = updateERC721ListingInfo(listing, event.params.listingId, event);

  listing.cancelled = true;
  listing.save();
}

export function handleERC721ListingRemoved(event: ERC721ListingRemoved): void {
  let listing = getOrCreateERC721Listing(event.params.listingId.toString());
  listing = updateERC721ListingInfo(listing, event.params.listingId, event);

  listing.cancelled = true;
  listing.save();
}
