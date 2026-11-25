import {describe,it,expect} from 'vitest';
import {channelLogo} from '../src/lib/channel-logos';
import {channelSpriteIndex} from '../src/lib/channel-sprite';
import {otherStreamSection} from '../src/lib/stream-order';
describe('channel directory',()=>{
  it('recognises sports networks in titles and uses bundled marks only',()=>{
    for(const title of ['SuperSport Motorsport','Sky Sports Cricket','ESPN 2','DAZN 1','TNT Sports 1','beIN Sports','MotoGP Channel','S*perSport Premier League','Fox Sports 1','BBC News','CNN','TSN4','ESPN2','CANAL+ Sport','NBC Sports Boston','Sony Sports 5']) expect(channelLogo(title)).toMatch(/^data:image\//);
    expect(channelLogo('SpongeBob')).toBeNull();
  });
  it('matches the NFL and UFC as well as known channel names, with safe fallback',()=>{
    expect(channelSpriteIndex('NFL Network')).not.toBeNull();
    expect(channelSpriteIndex('UFC Fight Pass 24/7')).not.toBeNull();
    expect(channelSpriteIndex('Team A vs Team B','NFL')).not.toBeNull();
    expect(channelSpriteIndex('Definitely Unrecognised Channel')).toBeNull();
    expect(channelSpriteIndex('CNN · HD')).not.toBeNull();
  });
  it('keeps sports ahead of entertainment and unknown round-the-clock channels',()=>{
    const section=(title:string,category:string,alwaysLive:boolean)=>otherStreamSection({title,category,alwaysLive});
    expect(section('SuperSport Motorsport','24/7 Channels',true)).toBe('sports');
    expect(section('SpongeBob','24/7 Channels',true)).toBe('other');
    expect(section('Cartoon Network','Sports',true)).toBe('other');
    expect(section('Mystery Channel','24/7 Channels',true)).toBe('other');
    expect(section('Race','Motorsport',false)).toBe('sports');
  });
});
