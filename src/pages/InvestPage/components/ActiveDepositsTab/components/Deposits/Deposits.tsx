/* eslint-disable no-nested-ternary */
import React, { useState, useEffect } from 'react';
import cn from 'classnames';
import { CellProps } from 'react-table';
import { times } from 'lodash';
import { SpinnerComponent } from 'react-element-spinner';

import { Web3Context } from 'components/Web3Provider';
import Vault from 'components/Vaults';
import { showNotification } from 'components/UILib/notifications/notificationUtils';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import NoDeposit from '../assets/NoDeposit-1.svg';
import {
  Table,
  NOTIFICATION_TYPES,
  Button,
  Icon,
} from '../../../../../../components/UILib';
// import { DepositWithdrawButtons } from '../DepositWithdrawButtons';

import s from './Deposits.module.scss';

const vaultClient = new Vault();
// const vaultAddress = process.env.REACT_APP_BAL_ODEFI_RP0_Vault;

interface ActiveDepositsProps {
  setSelectedDeposit: (id: string) => void;
}

export const Deposits: React.FC<ActiveDepositsProps> = () => {
  function getPercentageValue(value: number) {
    return `${value >= 0 ? '+' : '-'}${value}%`;
  }

  const [entry, setEntry] = useState(0);
  const [bal, setBal] = useState(0);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateFlag, setUpdateFlag] = useState(0);
  const { address, updateTokenBalance } = React.useContext(Web3Context) || {};
  const [apy, setAPY] = React.useState(0);

  function getPositiveNegativeClassName(value: number) {
    const isRatePositive = value >= 0;

    return cn({
      [s.positive]: isRatePositive,
      [s.negative]: !isRatePositive,
    });
  }

  async function getUserBalance(who: string) {
    const balance = await vaultClient.getUserVaultBalance(who);

    if (balance === 0) {
      setEntry(0);
    } else {
      setEntry(1);
      setBal(balance);
    }

    setLoading(false);
  }

  async function getAPY() {
    const rate = await vaultClient.getStrategyAPY();

    setAPY(rate);
  }

  useEffect(() => {
    if (address) {
      getUserBalance(address);
      getAPY();
    }
  }, [address, updateFlag]);

  async function handleWithdraw() {
    const tag = 'vault withdraw';

    setPending(true);

    const tx = address && (await vaultClient.userWithDrawAll(address));

    setPending(false);

    if (tx) {
      // hideModal();
      if (updateTokenBalance) await updateTokenBalance();

      showNotification({
        type: NOTIFICATION_TYPES.SUCCESS,
        description: 'Withdrawing assets successfully',
        lifetime: 5000,
        tag,
      });

      const flag = updateFlag + 1;

      setUpdateFlag(flag);
    } else {
      showNotification({
        type: NOTIFICATION_TYPES.ERROR,
        description: 'Withdrawing assets failed, please try again later.',
        lifetime: 5000,
        tag,
      });
    }
  }

  const columns = React.useMemo(
    () => [
      {
        Header: 'Asset',
        accessor: 'asset',
        cellClassName: s.narrowColumns,
        Cell: ({ cell }: CellProps<{ value: string }>) => {
          const { value } = cell;

          return <div className={s.assetCell}>{value}</div>;
        },
      },
      {
        Header: (
          <div>
            <div>Current Balance</div>
            {/* <div className={s.balanceChange}>Recent balance change</div> */}
          </div>
        ),
        accessor: 'balance',
        cellClassName: s.narrowColumns,
        Cell: ({ cell }: CellProps<{ balance: number; rate: number }>) => {
          const { balance } = cell.value;

          // const rateClassName = cn(s.rate, getPositiveNegativeClassName(rate));

          return (
            <div className={s.balanceInfo}>
              <div className={s.balance}>{balance}</div>
              {/* <div className={rateClassName}>{getPercentageValue(rate)}</div> */}
            </div>
          );
        },
      },
      {
        Header: 'Strategy APY',
        cellClassName: s.narrowColumns,
        accessor: 'strategyAPY',
        Cell: ({ cell }: CellProps<{ value: number }>) => {
          const { value } = cell;

          return (
            <div className={getPositiveNegativeClassName(value)}>
              {getPercentageValue(value)}
            </div>
          );
        },
      },
      {
        Header: ' ',
        accessor: 'strategyName',
      },
      {
        Header: 'Actions',
        cellClassName: s.actionCell,
        Cell: () => (
          <Button
            variant="monochrome"
            disabled={!address}
            onClick={handleWithdraw}
            leftElement={<Icon name="withdraw" />}
          >
            Withdraw
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, pending],
  );

  const data = React.useMemo(
    () =>
      times(entry, (i) => ({
        id: i.toString(),
        asset: 'NEWO',
        balance: {
          balance: bal,
          // rate: 1.2,
        },
        strategyAPY: apy,
        // strategyName: 'Strategy name',
      })),
    [entry, bal, apy],
  );

  // function handleRowClick(row: Row) {
  //   const id = get(row, 'original.id');

  //   setSelectedDeposit(id);
  // }

  return (
    <div>
      {loading ? (
        <SkeletonTheme color="#202020" highlightColor="#444">
          <p>
            <Skeleton count={2} height={50} />
          </p>
        </SkeletonTheme>
      ) : entry !== 0 ? (
        <>
          <Table
            columns={columns}
            data={data}
            rowHeight={76}
            tableHeight={418}
            // onRowClick={handleRowClick}
          />
          <SpinnerComponent
            loading={pending}
            position="global"
            message="Withdraw transaction pending ..."
            color="#070707"
          />
        </>
      ) : (
        <div>
          <p className={s.tip}>
            It looks like you don&apos;t have any active deposit right now.
          </p>
          <img
            src={NoDeposit}
            alt="No Active Deposit"
            className={s.noDepositImg}
          />
        </div>
      )}
    </div>
  );
};