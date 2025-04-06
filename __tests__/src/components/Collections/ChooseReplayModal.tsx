import { useState } from "react";
import styled from "styled-components";

export function ChooseReplay({ close, onChange }: { close: any, onChange: any }) {

    const [replays] = useState(() => {
        const allKeys = Object.keys(localStorage);
        const replayKeys = allKeys.filter((key) => key.startsWith("replay_"));
        return replayKeys.map((replay) => ({ name: replay, data: null }));
    });

    const [replay, setReplay] = useState("");

    const setReplayData = () => {
        const replayData = JSON.parse(window.localStorage.getItem(replay)!);
        onChange({
            name: replay,
            data: replayData
        })
    }

    return (
        <ModalOverlay>
            <ModalContainer>
                <ModalHeader>
                    <Title>Select a Replay</Title>
                    <CloseButton onClick={close}>×</CloseButton>
                </ModalHeader>

                <ModalContent>
                    <SelectReplay
                        onChange={(e:any) => setReplay(e.target.value)}
                        value={replay}
                    >
                        <option value="">Select a Replay</option>
                        {replays.map((replayItem, index) => (
                            <option key={index} value={replayItem.name}>
                                {replayItem.name}
                            </option>
                        ))}
                    </SelectReplay>

                    <ContinueButton
                        disabled={!replay}
                        onClick={setReplayData}
                    >
                        Continue
                    </ContinueButton>
                </ModalContent>
            </ModalContainer>
        </ModalOverlay>
    );
}

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    background-color: white;
    width: 400px;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    color: #333;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: 24px;
    color: #333;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
        color: red;
    }
`;

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 15px;
`;

const SelectReplay = styled.select`
    padding: 10px;
    font-size: 16px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background-color: #fff;
    color: #333;
    cursor: pointer;

    &:focus {
        border-color: #333;
        outline: none;
    }
`;

const ContinueButton = styled.button`
    padding: 12px;
    font-size: 16px;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background-color: #45a049;
    }

    &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
`;