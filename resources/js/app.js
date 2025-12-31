import './bootstrap';
import Web3 from 'web3';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

window.addEventListener('DOMContentLoaded', () => {
    if(document.querySelectorAll('.release-card').length > 0) {
        gsap.to('.release-card:not(:last-child)', {
            yPercent: -130,
            stagger: 0.5,
            boxShadow: '0 15px 0 rgba(0,0,0,0.35)',
            scrollTrigger: {
                trigger: '#releases',
                start: 'top top',
                scrub: true,
                pin: true,
                end: '+=2000px',
            }
        });
    }
});

// External links
document.querySelectorAll("main a[href^=http]:not([href*='//thisisrooms.com']), main a[href^='//']:not([href*='//thisisrooms.com']), main a[target='_blank']").forEach(function(element) {
    // Open link in new tab always, regardless of target attribute
    element.addEventListener('click', function(event) {
        event.preventDefault();
        window.open(element.href);
    });
});

// Add UTM to URL after page load
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        let url = new URL(window.location.href);
        url.searchParams.set("utm_source", "manualshare");
        window.history.replaceState(null, "", url);
    }, 1000);
});

// Initialize Web3 with MetaMask or other provider
let web3;
if (typeof window.ethereum !== 'undefined') {
    web3 = new Web3(window.ethereum);
} else if (Web3.givenProvider) {
    web3 = new Web3(Web3.givenProvider);
} else {
    console.warn('No Ethereum provider found. Please install MetaMask or another Web3 wallet.');
}

/**
 * Connect to user's wallet and get their address
 * @returns {Promise<string>} User's wallet address
 */
export async function connectWallet() {
    if (!web3) {
        throw new Error('Web3 is not initialized. Please install MetaMask or another Web3 wallet.');
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock your wallet.');
        }

        const address = accounts[0];
        return address;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
}

/**
 * Get the current connected wallet address (without requesting access)
 * @returns {Promise<string|null>} Current wallet address or null if not connected
 */
export async function getCurrentWalletAddress() {
    if (!web3) {
        return null;
    }

    try {
        const accounts = await web3.eth.getAccounts();
        return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
        console.error('Error getting wallet address:', error);
        return null;
    }
}

/**
 * Check if user owns a specific NFT (ERC-721)
 * @param {string} nftContractAddress - The NFT contract address
 * @param {string} userAddress - The user's wallet address
 * @param {string|null} tokenId - Optional specific token ID to check. If null, checks if user owns any token
 * @returns {Promise<boolean>} True if user owns the NFT, false otherwise
 */
export async function checkNFTOwnership(nftContractAddress, userAddress, tokenId = null) {
    if (!web3) {
        throw new Error('Web3 is not initialized.');
    }

    try {
        // ERC-721 ABI (minimal - just the functions we need)
        const erc721ABI = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [{"name": "_tokenId", "type": "uint256"}],
                "name": "ownerOf",
                "outputs": [{"name": "", "type": "address"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [
                    {"name": "_owner", "type": "address"},
                    {"name": "_index", "type": "uint256"}
                ],
                "name": "tokenOfOwnerByIndex",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            }
        ];

        const contract = new web3.eth.Contract(erc721ABI, nftContractAddress);

        // If specific token ID is provided, check ownership of that token
        if (tokenId !== null) {
            const owner = await contract.methods.ownerOf(tokenId).call();
            return owner.toLowerCase() === userAddress.toLowerCase();
        }

        // Otherwise, check if user owns any token from this contract
        const balance = await contract.methods.balanceOf(userAddress).call();
        return parseInt(balance) > 0;
    } catch (error) {
        console.error('Error checking NFT ownership:', error);
        throw error;
    }
}

/**
 * Get all NFT token IDs owned by user from a specific contract
 * @param {string} nftContractAddress - The NFT contract address
 * @param {string} userAddress - The user's wallet address
 * @returns {Promise<string[]>} Array of token IDs owned by the user
 */
export async function getUserNFTs(nftContractAddress, userAddress) {
    if (!web3) {
        throw new Error('Web3 is not initialized.');
    }

    try {
        const erc721ABI = [
            {
                "constant": true,
                "inputs": [{"name": "_owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            },
            {
                "constant": true,
                "inputs": [
                    {"name": "_owner", "type": "address"},
                    {"name": "_index", "type": "uint256"}
                ],
                "name": "tokenOfOwnerByIndex",
                "outputs": [{"name": "", "type": "uint256"}],
                "type": "function"
            }
        ];

        const contract = new web3.eth.Contract(erc721ABI, nftContractAddress);
        const balance = await contract.methods.balanceOf(userAddress).call();
        const tokenCount = parseInt(balance);

        if (tokenCount === 0) {
            return [];
        }

        // Get all token IDs owned by the user
        const tokenPromises = [];
        for (let i = 0; i < tokenCount; i++) {
            tokenPromises.push(contract.methods.tokenOfOwnerByIndex(userAddress, i).call());
        }

        const tokenIds = await Promise.all(tokenPromises);
        return tokenIds.map(id => id.toString());
    } catch (error) {
        console.error('Error getting user NFTs:', error);
        throw error;
    }
}

// Example usage (uncomment to test):
try {
    // Connect wallet
    const address = await connectWallet();
    console.log('Wallet address:', address);

    // Check if user owns a specific NFT contract
    const nftContractAddress = '0xb08fbF596DB33Ed641156f1d90Ea5b0B78B6f1Db'; // Replace with your NFT contract address
    const ownsNFT = await checkNFTOwnership(nftContractAddress, address);
    console.log('User owns NFT:', ownsNFT);

    // Check if user owns a specific token ID
    const nftSpecificTokenId = '0';
    const ownsSpecificToken = await checkNFTOwnership(nftContractAddress, address, nftSpecificTokenId);
    console.log('User owns token ID 0:', ownsSpecificToken);

    // Get all NFTs owned by user
    // const userNFTs = await getUserNFTs(nftContractAddress, address);
    // console.log('User NFT token IDs:', userNFTs);
} catch (error) {
    console.error('Error:', error);
}