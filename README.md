# What is it all about
App was created to indentify weak artifacts that we have currently equipped on our characters to allow us gradually upgrade them. For me it is very helpful to quickly see what characters need upgrading if I do not know what to do with resin or what strongbox artifact should I get.

# Requirements
As an input app requires you to export data from Genshin Optimizer (https://frzyc.github.io/genshin-optimizer). Two things are needed there:
- have artifacts equipped to your characters
- define RV filters for each character, so the app knows what stats are valuable for each of your characters (different builds want different stats)

Place the exported data into [input folder](/input) or change the input path to your desired location. All files in folder should be export files from Genshin Optimizer - app will scan the files and grab the newest one.

# User config
You can fine tune the app for your needs by editing [userConfig](/data/userConfig.json) - copy values from [defaultConfig](/data/defaultConfig.json) and change them or just change it directly in defaultConfig if you like.

# How to use
If you checked the Requirements and you are ready to go, just run:

```bash
npm start
```

You will get couple of files in the [output folder](/output) with the calculated data, but for most straightforward output just run [prettyDisplay.html](/output/prettyDisplay/prettyDisplay.html) and check out the table. You can sort it by clicking on the headers.