// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: cube;

const DATABASE_URL = 'https://api.notion.com/v1/databases/123456789123456789/query'
const BEARER_TOKEN = 'Bearer secret_ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NOTION_VERSION = '2022-06-28'

const receiveTaskData = async (databaseUrl, bearerToken, notionVersion) => {

    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
    const yyyy = today.getFullYear()
    const todayString = `${yyyy}-${mm}-${dd}`

    try {
        const request = new Request(databaseUrl)
        request.method = 'POST'
        request.headers = {
            'Authorization': bearerToken,
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json'
        }

        request.body = JSON.stringify({
            filter: {
                and: [
                    {
                        or: [
                            {
                                property: "Kanban Status",
                                select: {
                                    "equals": "To Do"
                                }
                            },
                            {
                                property: "Kanban Status",
                                select: {
                                    "equals": "Doing"
                                }
                            },
                            {
                                property: "Kanban Status",
                                select: {
                                    "equals": "Done"
                                }
                            }
                        ]
                    },
                    {
                        property: "Priority",
                        select: {
                            is_not_empty: true
                        }
                    },
                    {
                        property: "Done",
                        checkbox: {
                            does_not_equal: true
                        }
                    },
                    {
                        property: "Due",
                        date: {
                            on_or_before: todayString
                        }
                    }
                ]
            },
            sorts: [
                {
                    property: "Due",
                    direction: "descending"
                }
            ]
        })

        const taskData = await request.loadJSON()

        return taskData
    } catch(e) { 
        console.warn(e) 
    }
}

const extractTaskTitlesAndStates = (taskData) => {
    const taskTitles = taskData.results.map((result) => {
        try {
            const title = result?.properties?.Task?.title[0].plain_text
            const state = result?.properties["Kanban Status"].select?.name
            console.log(title)
            return {
                title: title,
                state: state
            }
        } catch(e) {
            console.warn(e)
            return undefined
        }
    }).filter((unfilteredTask) => unfilteredTask !== undefined)

    return taskTitles
}

const filterTaskTitlesAndStates = (taskTitlesAndStates, limit = -1) => {
    if(limit === -1){
        limit = taskTitlesAndStates.length
    }
    console.log(`Found Tasks: ${taskData.results.length}, Showing Tasks: ${limit}`)
    const filteredTaskTitlesAndStates = taskTitlesAndStates.filter((taskTitleAndState) => taskTitleAndState.state !== "Done").slice(0, limit)
    return filteredTaskTitlesAndStates
}

const initializeWidget = () => {
    const widget = new ListWidget()
    widget.backgroundColor = Color.black()
    return widget
}

const configureHeaderStack = async (headerStack) => {
    headerStack.centerAlignContent()
    let fm = FileManager.iCloud()

    const dir = fm.documentsDirectory()
    const path = fm.joinPath(dir, "notion/")
    const img = fm.readImage(path + "/notion_app_logo.png")
    // const img = await new Request('https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png').loadImage()

    const stackImage = headerStack.addImage(img)
    stackImage.imageSize = new Size(20,20)

    headerStack.addSpacer(10)
    
    const stackText = headerStack.addText('Notion')
    stackText.font = Font.title2()
}

const configureContentStack = (contentStack, taskTitlesAndStates) => {
    contentStack.layoutVertically()
    // contentStack.borderColor = Color.white()
    // contentStack.borderWidth = 2
    // contentStack.cornerRadius = 5
    // contentStack.setPadding(7, 7, 7, 7)
    // contentStack.size = new Size(300, 300) //w, h

    taskTitlesAndStates
        .forEach((openTaskTitleAndState) => {
            const textStack = contentStack.addStack()
            textStack.backgroundColor = Color.darkGray()
            textStack.cornerRadius = 10
            textStack.setPadding(3, 3, 3, 3)

            const taskText = textStack.addText('- ' + openTaskTitleAndState.title)
            taskText.textColor = Color.white()
            taskText.lineLimit = 1

            textStack.addSpacer()
            contentStack.addSpacer(5)
        })
    contentStack.addSpacer()
}

const configureLineStack = (lineStack) => {
    lineStack.backgroundColor = Color.white()
    lineStack.size = new Size(0,1)
    lineStack.cornerRadius = 10
    lineStack.addSpacer()
}

const createTaskRow = (taskTitle, table) => {
    const row = new UITableRow()
    const textCell = row.addText(taskTitle.title)
    const stateCell = row.addButton(taskTitle.state)
    textCell.widthWeight = 80
    stateCell.widthWeight = 20
    stateCell.rightAligned()
    stateCell.onTap = () => {
        console.log('test')
        // TODO: reload content and send update
        // table.reload()
    }
    return row
}

const goToHomeScreen = () => {
    Safari.open(`shortcuts://run-shortcut?name=Homescreen`)
  }

const taskData = await receiveTaskData(DATABASE_URL, BEARER_TOKEN, NOTION_VERSION)
const taskTitlesAndStates = extractTaskTitlesAndStates(taskData, 8)

if(config.runsInWidget){
    const widget = initializeWidget()
    const headerStack = widget.addStack()
    const lineStack = widget.addStack() // draw line
    widget.addSpacer(10)
    const contentStack = widget.addStack()

    const filteredTaskTitlesAndStates = filterTaskTitlesAndStates(taskTitlesAndStates, 8)

    await configureHeaderStack(headerStack)
    configureLineStack(lineStack)
    configureContentStack(contentStack, filteredTaskTitlesAndStates)

    Script.setWidget(widget)
    Script.complete()

    widget.presentLarge()

} else {
    let table = new UITable()
    table.showSeparators = true
    taskTitlesAndStates.forEach((taskTitleAndState)=>{
        table.addRow(createTaskRow(taskTitleAndState, table))
    })
    let row = new UITableRow()
    row.addText("Fertig")
    row.onSelect = () => {
        App.close()
    }
    table.addRow(row)
    table.present(true).then(() => {
        App.close()
    })
}


