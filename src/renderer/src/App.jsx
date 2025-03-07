import { faBox, faCut, faDownload, faFileDownload, faLink, faRepeat, faScroll, faVideo, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormControlLabel, FormGroup, InputLabel, LinearProgress, MenuItem, Select, Switch, TextField } from '@mui/material';
import getVideoId from 'get-video-id';
import { useEffect, useReducer, useState } from 'react';
import { CircularProgressbarWithChildren } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const dataFetchErrors = {
  EMPTY_URL: "The URL can not be empty",
  WRONG_SERVICE: "dlpal only works with YouTube videos"
};

const dataFetchTypes = {
  ON_LOADING: "on_loading",
  OFF_LOADING: "off_loading",
  SET_URL: "set_url",
  FETCH_ERROR: "fetch_error"
};

function dataFetchReducer(state, action) {
  const type = action.type;

  if (type == dataFetchTypes.ON_LOADING) return { ...state, loading: true };
  if (type == dataFetchTypes.OFF_LOADING) return { ...state, loading: false };

  if (type == dataFetchTypes.SET_URL) {
    const { input } = action;
    let error = false, helperText = false;

    if (!input || input.length < 1) {
      error = true;
      helperText = dataFetchErrors.EMPTY_URL;
    } else {
      const validation = getVideoId(input);

      if (validation.service != "youtube") {
        error = true;
        helperText = dataFetchErrors.WRONG_SERVICE;
      }
    }

    return {
      ...state,
      url: {
        ...state.url,
        input,
        error,
        helperText
      }
    };
  }

  if (type == dataFetchTypes.FETCH_ERROR) {
    const error = action.error;

    return {
      ...state,
      url: {
        ...state.url,
        error: true,
        helperText: error
      }
    };
  }
}

function App() {
  const [dataFetchState, dataFetchDispatch] = useReducer(dataFetchReducer, {
    loading: false,
    url: {
      input: "",
      error: true,
      helperText: dataFetchErrors.EMPTY_URL
    }
  });

  const [videoData, setVideoData] = useState(null);
  const [selectedVideoFormat, setSelectedVideoFormat] = useState(null);
  const [selectedAudioFormat, setSelectedAudioFormat] = useState(null);

  const [getVideo, setGetVideo] = useState(true);
  const [getAudio, setGetAudio] = useState(true);
  const [getMerge, setGetMerge] = useState(true);
  const [getKeep, setGetKeep] = useState(false);

  const initial_progress_value = 0;
  const initial_progress_color = "secondary";
  const initial_progress_action = "";

  const progress_colors = {
    primary: "144, 202, 249",
    secondary: "206, 147, 216",
    error: "244, 67, 54",
    warning: "255, 167, 38",
    info: "41, 182, 246",
    success: "102, 187, 106",
  };

  const [downloading, setDownloading] = useState(false);
  const [progressValue, setProgressValue] = useState(initial_progress_value);
  const [progressColor, setProgressColor] = useState(initial_progress_color);
  const [progressAction, setProgressAction] = useState(initial_progress_action);

  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const makeProgressValue = (progress, modifier) => {
    if (!progress || progress < 0) return 0;
    else {
      if (progress > 100) return 100;
      else return (modifier) ? modifier(progress) : progress;
    }
  };

  useEffect(() => {
    window.api.listenToMain("progress", (value) => setProgressValue(value));
    window.api.listenToMain("color", (color) => setProgressColor(color));
    window.api.listenToMain("action", (action) => setProgressAction(action));
    window.api.listenToMain("finish", () => {
      setDownloading(false);
      setProgressValue(initial_progress_value);
      setProgressColor(initial_progress_color);
      setProgressAction("");
    });
  });

  return (
    <div>
      <div className="p-8">
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-3xl">dlpal</span>
          </div>
          <div className="flex items-center gap-5 w-full mt-1">
            <TextField className="w-3/5" size="small" label={(
              <>
                <FontAwesomeIcon icon={faLink} />&nbsp;Video URL
              </>
            )} variant="outlined" error={dataFetchState.url.error} helperText={dataFetchState.url.helperText} value={dataFetchState.url.input} onChange={(e) => dataFetchDispatch({
              type: dataFetchTypes.SET_URL,
              input: e.target.value
            })} disabled={downloading || Boolean(videoData)} />
            <Button variant="contained" className={`${(dataFetchState.url.error) ? "invisible" : ""}`} loading={dataFetchState.loading} onClick={() => {
              dataFetchDispatch({
                type: dataFetchTypes.ON_LOADING
              });

              window.api.fetchData(dataFetchState.url.input).then((data) => {
                dataFetchDispatch({
                  type: dataFetchTypes.OFF_LOADING
                });

                if (data.error) {
                  if (data.error.match(/private video/g)) return dataFetchDispatch({
                    type: dataFetchTypes.FETCH_ERROR,
                    error: "dlpal can not download private videos"
                  });

                  return dataFetchDispatch({
                    type: dataFetchTypes.FETCH_ERROR,
                    error: "dlpal can not download this video"
                  });
                } else {
                  setSelectedVideoFormat(data.formats.video[0].id);
                  setSelectedAudioFormat(data.formats.audio[0].id);
  
                  setVideoData(data);
                }
              });
            }} disabled={downloading || Boolean(videoData)}><FontAwesomeIcon icon={faDownload} />&nbsp;Fetch data</Button>
            {(videoData) ? (
              <Button variant="contained" color="error" onClick={async () => {
                await window.api.clearStore();

                dataFetchDispatch({
                  type: dataFetchTypes.SET_URL,
                  input: ""
                });

                setVideoData(null);
              }} disabled={downloading}><FontAwesomeIcon icon={faRepeat} />&nbsp;Reset</Button>
            ) : ""}
          </div>
          {
            (videoData) ? (
              <div>
                <div className="grid grid-cols-4">
                  <div className="col-span-3">
                    <span className="text-lg"><FontAwesomeIcon icon={faScroll} />&nbsp;{videoData.title}</span>
                    <img className="h-48 rounded-lg mt-2" src={videoData.thumbnail} />
                  </div>
                  {(downloading) ? (
                    <div className="flex items-center">
                      <div className="flex flex-col gap-2 w-28">
                        <CircularProgressbarWithChildren styles={{
                          path: {
                            stroke: `rgba(${progress_colors[progressColor]}, 1)`
                          }
                        }} value={makeProgressValue(progressValue)}>
                          <span>{makeProgressValue(progressValue, (v) => v.toFixed(0))}%</span>
                          <span className="text-xs">{progressAction}</span>
                        </CircularProgressbarWithChildren>
                      </div>
                    </div>
                  ) : ""}
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-4 mt-6">
                    {(getVideo) ? (
                      <FormControl>
                        <InputLabel id="video-quality"><FontAwesomeIcon icon={faVideo} />&nbsp;Video quality</InputLabel>
                        <Select
                          labelId="video-quality"
                          label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Video quality"
                          value={selectedVideoFormat}
                          onChange={(e) => setSelectedVideoFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {videoData.formats.video.map((f) => (
                            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(getAudio) ? (
                      <FormControl>
                        <InputLabel id="audio-quality"><FontAwesomeIcon icon={faVolumeHigh} />&nbsp;Audio quality</InputLabel>
                        <Select
                          labelId="audio-quality"
                          label="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Audio quality"
                          value={selectedAudioFormat}
                          onChange={(e) => setSelectedAudioFormat(e.target.value)}
                          disabled={downloading}
                        >
                          {videoData.formats.audio.map((f) => (
                            <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : ""}
                    {(getVideo || getAudio) ? (
                      <Button variant="contained" color="success" onClick={async () => {
                        window.api.openDirectory().then(async (path) => {
                          if (path) {
                            const download_data = {
                              video_id: videoData.id,
                              title: videoData.title.replace(/[&\/\\#,+()$~%.'":*?<>{}\|]/g, ""),
                              save_path: path,
                              merge: getMerge,
                              keep_files: getKeep
                            };

                            if (getVideo) download_data.video_format = selectedVideoFormat;
                            if (getAudio) download_data.audio_format = selectedAudioFormat;

                            setDownloading(true)

                            await window.api.beginDownload(download_data);
                          }
                        });
                      }} disabled={downloading}><FontAwesomeIcon icon={faFileDownload} />&nbsp;&nbsp;BEGIN DOWNLOAD</Button>
                    ) : ""}
                    {(downloading) ? (
                      <LinearProgress variant="determinate" color={progressColor} value={makeProgressValue(progressValue)} />
                    ) : ""}
                  </div>
                  <div className="flex flex-col gap-4 mt-6">
                    <FormGroup>
                      <FormControlLabel control={<Switch checked={getVideo} onChange={(e) => setGetVideo(e.target.checked)} disabled={downloading} />} label={(
                        <>
                          <FontAwesomeIcon icon={faVideo} />&nbsp;Download video
                        </>
                      )} />
                      <FormControlLabel control={<Switch checked={getAudio} onChange={(e) => setGetAudio(e.target.checked)} disabled={downloading} />} label={(
                        <>
                          <FontAwesomeIcon icon={faVolumeHigh} />&nbsp;Download video
                        </>
                      )} />
                      {(getVideo && getAudio) ? (
                        <FormControlLabel control={<Switch checked={getMerge} onChange={(e) => setGetMerge(e.target.checked)} disabled={downloading} />} label={(
                          <>
                            <FontAwesomeIcon icon={faCut} />&nbsp;Merge video and audio
                          </>
                        )} />
                      ) : ""}
                      {(getMerge && (getVideo && getAudio)) ? (
                        <FormControlLabel control={<Switch checked={getKeep} onChange={(e) => setGetKeep(e.target.checked)} disabled={downloading} />} label={(
                          <>
                            <FontAwesomeIcon icon={faBox} />&nbsp;Keep separate files
                          </>
                        )} />
                      ) : ""}
                    </FormGroup>
                  </div>
                </div>
              </div>
            ) : ""
          }
        </div>
      </div>
      <div className="footer uncopyable pr-4 pb-4">
        <span className="text-xs text-gray-500"><span className="text-red-500 hover:font-bold" onClick={() => setDisclaimerOpen(true)}>Disclaimer</span> - <span className="hover:font-bold" onClick={async () => {
          await window.api.openLink("https://github.com/anventec");
        }}>Developed by Anventec (Anven)</span></span>
      </div>
      <Dialog open={disclaimerOpen} onClose={() => setDisclaimerOpen(false)}>
          <DialogTitle>Disclaimer</DialogTitle>
          <DialogContent>
            <DialogContentText>
            <ul>
              <li>dlpal will not be held responsible for what end users do with downloaded content.</li>
              <li className="mt-2">dlpal do not own nor claim to own the rights to any of the content that end users can download.</li>
              <li className="mt-2">dlpal is not associated in any way with YouTube or Google LLC.</li>
              <li className="mt-2">YouTube is a registered trademark of Google LLC.</li>
              <li className="mt-2">dlpal is still a work in progress. Bugs are expected.</li>
            </ul>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDisclaimerOpen(false)}>Close</Button>
          </DialogActions>
      </Dialog>
    </div>
  )
}

export default App