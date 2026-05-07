require('dotenv/config')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
    }
  }
}`

async function fetchContributions(login) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables: { login } })
  })
  const json = await res.json()
  return json.data
}

module.exports = { fetchContributions }
