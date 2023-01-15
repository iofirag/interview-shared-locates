import axios from 'axios';
import React, { useEffect, useState, useMemo } from 'react';

const baseUrl = "https://9g7qfsq0qk.execute-api.us-east-1.amazonaws.com/v1/session";

function LocateViewer() {
    const [sessionId, setSessionId] = useState(null);
    const [requiredLocates, setRequiredLocates] = useState({});
    const [availableLocates, setAvailableLocates] = useState({});
    const [symbolSubs, setSymbolSubs] = useState<any>({});
    const [percentMap, setPercentMap] = useState<any>({});

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

    
    const handleLocatesRequirementsRequestClick = () => {
        // Retrieve the locate requests when the button is clicked
        axios.get(`${baseUrl}/${sessionId}/locates`)
            .then(response => {
                console.log(response.data);
                setRequiredLocates(response.data);
            })
            .catch(error => {
                console.error(error);
            });
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
    }

    return (
        <>
            <div>locate viewer</div>
            <h1>Session ID: {sessionId}</h1>
            <button onClick={handleLocatesRequirementsRequestClick}>Retrieve Locates Requirements</button>
            <button onClick={handleAllocateRequiredLocatesRequestClick}>Allocate Required Locates</button>
            <div>
                <table>
                    <thead>
                        <tr>
                            <th>Machine</th>
                            <th>Symbol</th>
                            <th>Required Locates</th>
                            <th>Available Locates</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(requiredLocates).map(([machine, symbols], i) => (
                            <>
                                {Object.entries(symbols as any).map(([symbol, requiredLocates], j) => (
                                    <tr key={j}>
                                        <td>{machine}</td>
                                        <td>{symbol}</td>
                                        <td>{requiredLocates as number}</td>
                                        <td>{Math.floor(requiredLocates as number * percentMap[symbol] / 100)}</td>
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
                <table>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Available Locates</th>
                            <th>Equal shared by %</th>
                            <th>machines</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(availableLocates).map(([symbol, avilableLocates]) =>
                            <tr>
                                <td>{symbol}</td>
                                <td>{avilableLocates as number}</td>
                                <td>{percentMap[symbol]}%</td>
                                <td>{Object.keys(symbolSubs[symbol].subscribers).length}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default LocateViewer;
