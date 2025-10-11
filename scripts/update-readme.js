const fs = require('fs');
const axios = require('axios');

const ORG = 'OrgName';
const README_PATH = 'profile/README.md';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

(async () => {
    try {
        const { data: repos } = await axios.get(`https://api.github.com/orgs/${ORG}/repos?per_page=100`, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });

        // Fetch topics for each repo
        const reposWithTopics = await Promise.all(
            repos.map(async (repo) => {
                const { data: topicsData } = await axios.get(`https://api.github.com/repos/${ORG}/${repo.name}/topics`, {
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        Accept: 'application/vnd.github.mercy-preview+json'
                    }
                });
                return { ...repo, topics: topicsData.names };
            })
        );

        // Group by topic
        const topicGroups = {};
        reposWithTopics.forEach(repo => {
            const topics = repo.topics.length ? repo.topics : ['Uncategorized'];
            topics.forEach(topic => {
                if (!topicGroups[topic]) topicGroups[topic] = [];
                topicGroups[topic].push(repo);
            });
        });

        // Sort topics alphabetically, with 'Uncategorized' last
        const sortedTopics = Object.keys(topicGroups).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });

        // Build Markdown
        let repoList = '';
        sortedTopics.forEach(topic => {
            repoList += `### ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n\n`;
            topicGroups[topic]
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(repo => {
                    repoList += `- [${repo.name}](${repo.html_url}) ![Stars](https://img.shields.io/github/stars/${ORG}/${repo.name}?style=social) ![Issues](https://img.shields.io/github/issues/${ORG}/${repo.name})\n`;
                });
            repoList += '\n';
        });

        // Update README
        let readme = fs.readFileSync(README_PATH, 'utf-8');
        readme = readme.replace(/<!-- REPO-LIST-START -->[\s\S]*<!-- REPO-LIST-END -->/, `<!-- REPO-LIST-START -->\n${repoList}<!-- REPO-LIST-END -->`);
        fs.writeFileSync(README_PATH, readme);

        console.log('README updated successfully!');
    } catch (err) {
        console.error('Error updating README:', err);
    }
})();