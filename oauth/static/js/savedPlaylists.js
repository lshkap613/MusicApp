function playPlaylist(playlistIds) {
    //const encodedIds = encodeURIComponent(playlistIds);
    console.log("1:" + playlistIds);
    playlistIds = playlistIds.replace(/'/g, '"');
    console.log("2:" + playlistIds);
    playlistIds = JSON.parse(playlistIds);
    console.log("3:" + playlistIds);
    
    const encodedIds = encodeURIComponent(JSON.stringify(playlistIds));

    window.location.href = "/player?playlist=" + encodedIds;

}