import { Button, ButtonGroup, CircularProgress } from '@mui/material';
import axios from 'axios';
import React, { useEffect, useState, useMemo } from 'react';
import CustomizedTables from './CustomizedTables';

const baseUrl = "https://9g7qfsq0qk.execute-api.us-east-1.amazonaws.com/v1/session";

export function LocateViewer() {
    const [sessionId, setSessionId] = useState(null);
    const [requiredLocates, setRequiredLocates] = useState<any>({});
    const [availableLocates, setAvailableLocates] = useState<any>({});
    const [symbolSubs, setSymbolSubs] = useState<any>({});
    const [percentMap, setPercentMap] = useState<any>({});
    const [isAllocated, setIsAllocated] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState<boolean>(false);


    const updateServer = useMemo(() => async (updateMachinesBody: any) => {
        try {
            await axios.put(`${baseUrl}/${sessionId}/locates`, JSON.stringify(updateMachinesBody))
            alert('success')
        } catch (error) {
            alert('error')
        }
    }, [sessionId])

    useEffect(() => {
        // Create a new session when the component mounts
        axios.post(baseUrl)
            .then(response => {
                setSessionId(response.data);
            })
            .catch(error => {
                console.error(error);
            });
    }, []);

    useEffect(() => {
        if (!Object.keys(percentMap).length) return;
        // Calculate put body
        const updateMachinesBody: any = {}
        Object.entries(requiredLocates).map(([machine, symbols]) => {
            updateMachinesBody[machine] = {}
            return Object.entries(symbols as any).map(([symbol, locateNum]) => {
                updateMachinesBody[machine][symbol] = Math.floor(locateNum as number * percentMap[symbol] / 100)
            })
        })
        updateServer(updateMachinesBody)
    }, [percentMap, sessionId, requiredLocates, updateServer])


    const handleLocatesRequirementsRequestClick = async () => {
        // Retrieve the locate requests when the button is clicked
        try {
            setIsFetching(true)
            const locatesRes = await axios.get(`${baseUrl}/${sessionId}/locates`)
            setRequiredLocates(locatesRes.data);
            setIsAllocated(false)
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetching(false)
        }
    };

    const arrangeLocatesToMap = (requiredLocates: any) => {
        const symbolLocatesMap: any = {}
        for (const [machine, locateList] of Object.entries(requiredLocates)) {
            for (const [symbol, locates] of Object.entries(locateList as any)) {
                if (!symbolLocatesMap[symbol]) {
                    symbolLocatesMap[symbol] = {
                        total: 0,
                        subscribers: {}
                    }
                }
                symbolLocatesMap[symbol].total += locates
                symbolLocatesMap[symbol].subscribers[machine as string] = locates
            }
        }
        return symbolLocatesMap
    }

    const handleAllocateRequiredLocatesRequestClick = async () => {
        try {
            setIsFetching(true)
            const symbolLocatesMap: any = arrangeLocatesToMap(requiredLocates)
            setSymbolSubs(symbolLocatesMap)

            // Fetch all symbols
            const allocateReqList = Object.keys(symbolLocatesMap).map(symbol =>
                axios.post(`${baseUrl}/${sessionId}/broker?symbol=${symbol}&quantity=${symbolLocatesMap[symbol].total}`))
            const responseList = await Promise.all(allocateReqList)
            // Create (symbol -> available locates got) map
            const _availableLocates: any = {}
            for (const symbolRes of responseList) {
                if (symbolRes.status === 200) {
                    if (!_availableLocates[symbolRes.data.symbol]) {
                        _availableLocates[symbolRes.data.symbol] = 0
                    }
                    _availableLocates[symbolRes.data.symbol] += symbolRes.data.quantity
                }
            }
            setAvailableLocates(_availableLocates)

            // Calculate percent map
            const percentMap: any = {}
            Object.keys(_availableLocates).map(symbol =>
                percentMap[symbol] = (_availableLocates[symbol] / symbolLocatesMap[symbol].total * 100).toFixed(2))
            setPercentMap(percentMap)
            setIsAllocated(true)
        } catch (error) {
            setIsAllocated(false)
        } finally {
            setIsFetching(false)
        }
    }

    const table1Headers = ['Machine', 'Symbol', 'Required Locates', 'Available Locates'];
    const table1Rows: any[] = Object.entries(requiredLocates).map(([machine, symbols]: any, i) => {
        for (const symbol in symbols) {
            return {
                machine,
                symbol,
                symbolRequiredLocates: symbols[symbol],
                symbolAvilableLocates: percentMap[symbol] ? Math.floor(percentMap[symbol] / 100 * symbols[symbol]) : 'NaN'
            }
        }
    })

    const table2Headers = ['Symbol', 'Available Locates', 'Equal shared by %', 'machines'];
    const table2Rows: any[] = Object.entries(availableLocates).map(([symbol, avilableLocatesVal]: any, i) => {
        return {
            symbol,
            avilableLocatesVal,
            avilablePrecent: `${percentMap[symbol]}%`,
            locatesLength: Object.keys(symbolSubs[symbol].subscribers).length
        }
    })

    return (
        <>
            <div>locate viewer</div>
            <h1>Session ID: {sessionId}</h1>
            <ButtonGroup variant="outlined" aria-label="outlined button group">
                <Button onClick={handleLocatesRequirementsRequestClick} disabled={isFetching} >Retrieve Locates Requirements</Button>
                <Button onClick={handleAllocateRequiredLocatesRequestClick} disabled={isAllocated || isFetching}>Allocate Required Locates</Button>
                {isFetching &&
                    <CircularProgress style={{ width: '30px', height: '30px', marginLeft: '10px', alignSelf: 'center' }} />
                }
            </ButtonGroup>
            <div style={{ display: 'flex' }}>
                <CustomizedTables key={'table1'} headerList={table1Headers} rows={table1Rows} />
                <CustomizedTables key={'table2'} headerList={table2Headers} rows={table2Rows} />
            </div>
        </>
    );
};
