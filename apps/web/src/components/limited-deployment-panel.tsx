'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {createPublicClient, formatEther, http, type Address, type Hash} from 'viem';

import {Button, SourceBadge, StatePanel, StatusPill} from '@/components/primitives';
import {MONAD_TESTNET_CHAIN_ID, monadTestnet} from '@/lib/chain';
import {LIMITED_DEPLOYMENT, prepareLimitedDeployment, type LimitedDeploymentPlan} from '@/lib/limited-deployment';
import {runtimeConfig} from '@/lib/runtime-config';
import {useWalletSession} from '@/wallet/wallet-context';

const publicClient = createPublicClient({chain: monadTestnet, transport: http()});

type DeploymentStep = 'adapter' | 'policy';

export function LimitedDeploymentPanel() {
  const wallet = useWalletSession();
  const [plan, setPlan] = useState<LimitedDeploymentPlan>();
  const [nativeBalance, setNativeBalance] = useState<bigint>();
  const [adapterHash, setAdapterHash] = useState<Hash>();
  const [policyHash, setPolicyHash] = useState<Hash>();
  const [busy, setBusy] = useState<DeploymentStep>();
  const [error, setError] = useState<string>();

  const prepare = useCallback(async (address: Address) => {
    const [nonce, balance] = await Promise.all([
      publicClient.getTransactionCount({address, blockTag: 'pending'}),
      publicClient.getBalance({address}),
    ]);
    setPlan(prepareLimitedDeployment(address, BigInt(nonce)));
    setNativeBalance(balance);
  }, []);

  useEffect(() => {
    if (!wallet.address || !runtimeConfig.limitedDeployment) return;
    void prepare(wallet.address).catch(() => setError('Unable to read the pending nonce and native balance.'));
  }, [prepare, wallet.address]);

  const inFlight = wallet.transaction.phase === 'wallet_prompt' || wallet.transaction.phase === 'submitted';
  const blockers = useMemo(() => {
    const values: string[] = [];
    if (!runtimeConfig.limitedDeployment) values.push('The local limited-deployment flag is disabled.');
    if (!wallet.authenticated || !wallet.address) values.push('Connect the Privy embedded wallet.');
    if (wallet.chainId !== MONAD_TESTNET_CHAIN_ID) values.push('Switch the wallet to Monad Testnet 10143.');
    if (!plan) values.push('Pending nonce and deployment addresses are not prepared.');
    if (nativeBalance !== undefined && nativeBalance < LIMITED_DEPLOYMENT.gasSpendCap) {
      values.push('The wallet needs at least 0.23 MON to cover the declared full-sequence gas cap.');
    }
    return values;
  }, [nativeBalance, plan, wallet.address, wallet.authenticated, wallet.chainId]);

  const deploy = useCallback(
    async (step: DeploymentStep) => {
      if (!wallet.address || !plan) throw new Error('Deployment plan is unavailable.');
      setBusy(step);
      setError(undefined);
      try {
        const expectedNonce = step === 'adapter' ? plan.nonce : plan.nonce + 1n;
        const currentNonce = BigInt(
          await publicClient.getTransactionCount({address: wallet.address, blockTag: 'pending'}),
        );
        if (currentNonce !== expectedNonce) {
          throw new Error('Wallet nonce changed. Refresh the plan before submitting another transaction.');
        }

        if (step === 'policy') {
          const adapterCode = await publicClient.getBytecode({address: plan.adapterAddress});
          if (!adapterCode || adapterCode === '0x') {
            throw new Error('The disabled adapter is not deployed at the expected address.');
          }
        }

        const expectedAddress = step === 'adapter' ? plan.adapterAddress : plan.policyAddress;
        const existingCode = await publicClient.getBytecode({address: expectedAddress});
        if (existingCode && existingCode !== '0x') {
          throw new Error('The expected deployment address already contains code.');
        }

        const hash = await wallet.deployContract(
          step === 'adapter' ? 'deploy_adapter' : 'deploy_policy',
          step === 'adapter' ? plan.adapterTransaction : plan.policyTransaction,
          expectedAddress,
        );
        if (step === 'adapter') setAdapterHash(hash);
        else setPolicyHash(hash);
        setNativeBalance(await publicClient.getBalance({address: wallet.address}));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Deployment request failed.');
      } finally {
        setBusy(undefined);
      }
    },
    [plan, wallet],
  );

  if (!runtimeConfig.limitedDeployment) {
    return (
      <StatePanel state="missing" title="Limited deployment disabled">
        Enable the local-only deployment flag before preparing any public transaction.
      </StatePanel>
    );
  }

  return (
    <div className="page-stack">
      <section className="system-section" aria-labelledby="limited-boundary-heading">
        <div className="section-heading">
          <p className="eyebrow">Explicitly non-executable target</p>
          <h2 id="limited-boundary-heading">Public trade remains impossible.</h2>
        </div>
        <div className="primitive-card stack-md">
          <div className="primitive-row">
            <SourceBadge source="ONCHAIN" />
            <StatusPill status="waiting">Awaiting authorization</StatusPill>
          </div>
          <p>
            This path deploys only an adapter that always reverts execution and a policy whose immutable executor is the dead address. It does not deploy or activate a CRE receiver and cannot call Kuru.
          </p>
          <dl className="detail-grid">
            <div><dt>Network</dt><dd>Monad Testnet · 10143</dd></div>
            <div><dt>Wallet</dt><dd>{wallet.address ?? 'Unavailable'}</dd></div>
            <div><dt>Native balance</dt><dd>{nativeBalance === undefined ? 'Loading' : `${formatEther(nativeBalance)} MON`}</dd></div>
            <div><dt>Allowance cap</dt><dd>1.000000 USDC</dd></div>
            <div><dt>Aggregate gas-limit cap</dt><dd>2,210,000</dd></div>
            <div><dt>Worst-case gas-spend cap</dt><dd>{formatEther(LIMITED_DEPLOYMENT.gasSpendCap)} MON</dd></div>
          </dl>
        </div>
      </section>

      {blockers.length > 0 ? (
        <StatePanel state="missing" title="Deployment preparation blocked">
          {blockers.join(' ')}
        </StatePanel>
      ) : null}

      {plan ? (
        <section className="system-section" aria-labelledby="limited-addresses-heading">
          <div className="section-heading">
            <p className="eyebrow">Precomputed CREATE sequence</p>
            <h2 id="limited-addresses-heading">Two contracts, two wallet confirmations.</h2>
          </div>
          <div className="system-grid system-grid-two">
            <article className="primitive-card stack-md">
              <h3>1. Execution-disabled adapter</h3>
              <code>{plan.adapterAddress}</code>
              <p>Gas-limit cap: {LIMITED_DEPLOYMENT.gasLimits.adapter.toString()}</p>
              <Button
                disabled={blockers.length > 0 || inFlight || Boolean(adapterHash) || busy !== undefined}
                onClick={() => void deploy('adapter')}
              >
                {busy === 'adapter' ? 'Waiting for wallet' : adapterHash ? 'Adapter confirmed' : 'Deploy disabled adapter'}
              </Button>
              {adapterHash ? <code>{adapterHash}</code> : null}
            </article>
            <article className="primitive-card stack-md">
              <h3>2. Dead-executor policy</h3>
              <code>{plan.policyAddress}</code>
              <p>Gas-limit cap: {LIMITED_DEPLOYMENT.gasLimits.policy.toString()}</p>
              <Button
                disabled={blockers.length > 0 || inFlight || !adapterHash || Boolean(policyHash) || busy !== undefined}
                onClick={() => void deploy('policy')}
              >
                {busy === 'policy' ? 'Waiting for wallet' : policyHash ? 'Policy confirmed' : 'Deploy locked policy'}
              </Button>
              {policyHash ? <code>{policyHash}</code> : null}
            </article>
          </div>
        </section>
      ) : null}

      {error ? <StatePanel state="error" title="Deployment stopped">{error}</StatePanel> : null}
      {policyHash && plan ? (
        <StatePanel state="empty" title="Limited target confirmed">
          Configure the confirmed policy address locally, restart the application, and then perform approve, create, cancel, and revoke. Do not call execute.
        </StatePanel>
      ) : null}
    </div>
  );
}
