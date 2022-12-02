import JiraApi from 'jira-client';
import {IncomingWebhook} from "@slack/webhook";

const webhook = new IncomingWebhook('');

let jira = new JiraApi({
    protocol: 'https',
    host: 'profiru.atlassian.net',
    username: '',
    password: '',
    apiVersion: '2',
    strictSSL: true
});

const RESPONSIBLE_MAP = {
    'Web': ['<@kolesnikovvv>', '<@slipenchukdv>'],
    'RBO': ['<@kolesnikovvv>', '<@slipenchukdv>'],
    'Front': ['<@kolesnikovvv>', '<@slipenchukdv>'],
    'Back': ['<@pankratevks>', '<@osipovao>'],
    'Product': ['<@karepovals>'],
}

function get_random (list) {
    return list[Math.floor((Math.random()*list.length))];
}


const notifyAboutNotStudy = async () => {
    const sprints = (await jira.getAllSprints(40)).values;
    const next_sprint = sprints.find((sprint) => sprint.state === 'future' && !sprint.completeDate)
    const tasks = await jira.searchJira(`Sprint = "${next_sprint.name}" and "Story Points[Number]" is EMPTY and (status = Study or status = Analysis) and assignee is EMPTY`)
    const messages = tasks.issues.map((t) => {
        const main_component = t.fields.components[0] ? t.fields.components[0].name : 'Product';
        const responsibles = RESPONSIBLE_MAP[main_component] ? get_random(RESPONSIBLE_MAP[main_component]) : '- нет компонентов - <@karepovals>';
        return `https://profiru.atlassian.net/browse/${t.key} - ${t.fields.summary} - нужно взять на проработку для сл. спринта (${next_sprint.name}) - ${responsibles}`
    });
   const message = messages.join("\n\n");
   console.log(message);
   await webhook.send({
        text: message
   });


}

const notifyAboutStudy = async () => {
    const sprints = (await jira.getAllSprints(40)).values;
    const next_sprint = sprints.find((sprint) => sprint.state === 'future' && !sprint.completeDate)
    const tasks = await jira.searchJira(`Sprint = "${next_sprint.name}" and "Story Points[Number]" is EMPTY and (status = Study or status = Analysis) and assignee is not EMPTY`)
    const messages = tasks.issues.map((t) => {
        const assignee = t.fields.assignee.emailAddress ? t.fields.assignee.emailAddress.split('@')[0] : 'karepovals'
        return `https://profiru.atlassian.net/browse/${t.key} - ${t.fields.summary}  - <@${assignee}>`
    });
    const message = "У нас на проработке следующие задачи, если проработка завершена, переведите в статус Awaiting Estimate:\n"+messages.join("\n\n\n");
    await webhook.send({
        text: message
    });
}


const notifyAboutGrooming = async () => {
    const sprints = (await jira.getAllSprints(40)).values;
    const next_sprint = sprints.find((sprint) => sprint.state === 'future' && !sprint.completeDate)
    const tasks = await jira.searchJira(`Sprint = "${next_sprint.name}" and "Story Points[Number]" is EMPTY and status = "Awaiting estimate"`)
    const messages = tasks.issues.map((t) => {
        return `https://profiru.atlassian.net/browse/${t.key} - ${t.fields.summary}`
    });
    const message = "У нас проработаны следующие задачи для оценки сегодня:\n "+messages.join("\n\n\n");
    await webhook.send({
        text: message
    });
}

const t = async () => {
    await webhook.send({
        text: '===================================================================================='
    });
    await notifyAboutStudy();
    await webhook.send({
        text: '==================================================================================='
    });
    await notifyAboutNotStudy();
    await webhook.send({
        text: '===================================================================================='
    });
    await notifyAboutGrooming();
}

t()
