commentBox('5639883179687936-proj')

let promise=async (url) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            type: 'GET',
            success: (res) => {
                resolve(res);
            },
            error: (err) => {
                reject(err);
            }
        });
    });
}

let getChannels=async () => {
    return await promise('https://iptv-org.github.io/api/channels.json');
}

let getStreams=async () => {
    return await promise('https://iptv-org.github.io/api/streams.json');
}

let getCountries=async () => {
    return await promise('https://iptv-org.github.io/api/countries.json');
}

let updateQuality=(newQuality) => {
    window.hls.levels.forEach((level, levelIndex) => {
        if (level.height===newQuality) {
            console.log("Found quality match with "+newQuality);
            window.hls.currentLevel=levelIndex;
        }
    });
}

let check=(id, channelName, source) => {
    $.ajax({
        url: source,
        type: 'GET',
        beforeSend: () => {
            $(`#${id}`).html(`
                <div class="spinner-border" role="status">
                    <span class="sr-only"></span>
                </div>
            `);
        },
        success: (res) => {
            $('.toast-body').html(`Channel <b>${channelName}</b> is <span class="text-success">available now</span>`);
            $('#streamToast').toast({ delay: 4000 });
            $('#streamToast').toast('show');
            $(`#${id}`).html(`<button class="btn btn-success" onclick="play('${channelName}','${source}');" data-toggle="modal" data-target="#streamModal">Stream <i class="bi bi-box-arrow-up-right"></i></button>`);
        },
        error: (err) => {
            $('.toast-body').html(`Channel <b>${channelName}</b> is <span class="text-danger">not available now</span>`);
            $('#streamToast').toast({ delay: 4000 });
            $('#streamToast').toast('show');
            $(`#${id}`).html(`<p class="text text-danger">Not Available</p>`);
        }
    });
}

let video=document.querySelector("video");
let player=new Plyr('#streamTV');

let play=(channelName, source) => {
    $('#streamModalLabel').html(channelName);
    const defaultOptions={};

    if (Hls.isSupported()) {
        const hls=new Hls();
        hls.loadSource(source);
        hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {

            const availableQualities=hls.levels.map((l) => l.height)

            defaultOptions.quality={
                default: availableQualities[0],
                options: availableQualities,
                forced: true,
                onChange: (e) => updateQuality(e),
            }
            player=new Plyr(video, defaultOptions);
        });
        hls.attachMedia(video);
        window.hls=hls;
    } else {
        player=new Plyr(video, defaultOptions);
    }
    player.play();
}

$('#streamModal').on('hidden.bs.modal', function () {
    $('video').trigger('pause');
});

$('#checkAllStatus').click(() => {
    $('.checkStatus').click();
});

(async () => {
    let channels=await getChannels();
    let streams=await getStreams();
    let countries=await getCountries();

    let t=$('#all-tv').DataTable({
        initComplete: () => {
            $('#loading').remove();
        },
        lengthMenu: [
            [10, 25, 50, 100, 500, 1000],
            [10, 25, 50, 100, 500, 1000]
        ]
    });
    let counter=1;
    channels.forEach((channelData) => {
        let streamData=streams.filter(stream => stream.channel===channelData.id)[0]||'';
        let countryData=countries.filter(country => country.code===channelData.country)[0]||'';
        if (streamData && countryData) {
            let channel=channelData.website? `<a href="${channelData.website}" target="_blank">${channelData.name}</a>`:channelData.name;
            let logo=`
                    <div class="magic-box">
                        <img src="${channelData.logo}" class="magic-image" onError="this.onerror=null;this.src='/assets/img/no-image.png';" />
                    </div>
                `;
            let country=`${countryData.flag} ${countryData.name}`;
            streamData.url=streamData.url.replace('http://', 'https://');
            channelData.name=channelData.name.replace(`'`, ``);
            let stream=`<div id="stream-${counter}"><button class="btn btn-primary checkStatus" onclick="check('stream-${counter}','${channelData.name}','${streamData.url}')">Check Status <i class="bi bi-shield-check"></i></button></div>`;
            t.row.add([
                counter,
                channel,
                logo,
                country,
                stream
            ]);
            counter++;
        }
    });
    streams.forEach((streamData) => {
        if (!streamData.channel && streamData.url) {
            let url = new URL(streamData.url);
            let channel = `<a href="${url.origin}" target="_blank">${url.hostname}</a>`;
            let logo=`
                <div class="magic-box">
                    <img src="/tv/assets/img/no-image.png" class="magic-image"  />
                </div>
            `;
            let stream=`<div id="stream-${counter}"><button class="btn btn-primary checkStatus" onclick="check('stream-${counter}','${url.hostname}','${streamData.url}')">Check Status <i class="bi bi-shield-check"></i></button></div>`;
            t.row.add([
                counter,
                channel,
                logo,
                'Unknown',
                stream
            ]);
            counter++;
        }
    });
    t.draw();
})();
