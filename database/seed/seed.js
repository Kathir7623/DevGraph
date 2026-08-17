const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

// Load environment variables from server directory or root
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const uri = process.env.COGNODB_URI || process.env.NEO4J_URI;
const username = process.env.COGNODB_USERNAME || process.env.NEO4J_USERNAME || 'cognodb';
const password = process.env.COGNODB_PASSWORD || process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.error('Error: COGNODB_URI and COGNODB_PASSWORD environment variables are required.');
  console.error('Please create a server/.env file with these variables set.');
  process.exit(1);
}

console.log(`Connecting to CognoDB at ${uri}...`);
const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

async function runSeed() {
  const session = driver.session();
  try {
    // 1. Load seed datasets
    const developers = JSON.parse(fs.readFileSync(path.join(__dirname, 'developers.json'), 'utf8'));
    const technologies = JSON.parse(fs.readFileSync(path.join(__dirname, 'technologies.json'), 'utf8'));
    const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf8'));

    console.log('Successfully read seed files.');

    // 2. Clear database
    console.log('Clearing database...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Database cleared.');

    // 3. Create Constraints
    console.log('Creating database constraints...');
    const constraints = [
      'CREATE CONSTRAINT dev_id_unique IF NOT EXISTS FOR (d:Developer) REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT tech_id_unique IF NOT EXISTS FOR (t:Technology) REQUIRE t.id IS UNIQUE',
      'CREATE CONSTRAINT proj_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE'
    ];

    for (const constraint of constraints) {
      try {
        await session.run(constraint);
      } catch (err) {
        // CognoDB might have slightly different syntax or already have the constraint
        console.warn(`Constraint warning/skipped: ${err.message}`);
      }
    }
    console.log('Constraints setup processed.');

    // 4. Seed Technologies
    console.log('Seeding Technology nodes...');
    for (const tech of technologies) {
      await session.run(
        `MERGE (t:Technology {id: $id})
         ON CREATE SET t.name = $name, t.category = $category, t.description = $description
         ON MATCH SET t.name = $name, t.category = $category, t.description = $description`,
        tech
      );
    }
    console.log(`Seeded ${technologies.length} Technology nodes.`);

    // 5. Seed Developers & Skills
    console.log('Seeding Developer nodes and KNOWS relationships...');
    for (const dev of developers) {
      // Create Developer node
      await session.run(
        `MERGE (d:Developer {id: $id})
         ON CREATE SET d.name = $name, d.title = $title, d.email = $email, d.location = $location, d.bio = $bio, d.avatarUrl = $avatarUrl
         ON MATCH SET d.name = $name, d.title = $title, d.email = $email, d.location = $location, d.bio = $bio, d.avatarUrl = $avatarUrl`,
        {
          id: dev.id,
          name: dev.name,
          title: dev.title,
          email: dev.email,
          location: dev.location,
          bio: dev.bio,
          avatarUrl: dev.avatarUrl
        }
      );

      // Create relationships to technologies (KNOWS)
      if (dev.skills && dev.skills.length > 0) {
        for (const skill of dev.skills) {
          await session.run(
            `MATCH (d:Developer {id: $devId})
             MATCH (t:Technology {id: $techId})
             MERGE (d)-[r:KNOWS]->(t)
             SET r.level = $level, r.years = toInteger($years)`,
            {
              devId: dev.id,
              techId: skill.techId,
              level: skill.level,
              years: skill.years
            }
          );
        }
      }
    }
    console.log(`Seeded ${developers.length} Developer nodes and skills relationships.`);

    // 6. Seed Projects, Tech Usage, and Contributions
    console.log('Seeding Project nodes, USES relationships, and WORKED_ON relationships...');
    for (const proj of projects) {
      // Create Project node
      await session.run(
        `MERGE (p:Project {id: $id})
         ON CREATE SET p.name = $name, p.description = $description, p.status = $status, p.repoUrl = $repoUrl
         ON MATCH SET p.name = $name, p.description = $description, p.status = $status, p.repoUrl = $repoUrl`,
        {
          id: proj.id,
          name: proj.name,
          description: proj.description,
          status: proj.status,
          repoUrl: proj.repoUrl
        }
      );

      // Create relationships to technologies (USES)
      if (proj.techStack && proj.techStack.length > 0) {
        for (const techId of proj.techStack) {
          await session.run(
            `MATCH (p:Project {id: $projectId})
             MATCH (t:Technology {id: $techId})
             MERGE (p)-[:USES]->(t)`,
            {
              projectId: proj.id,
              techId: techId
            }
          );
        }
      }

      // Create relationships to developers (WORKED_ON)
      if (proj.contributors && proj.contributors.length > 0) {
        for (const contributor of proj.contributors) {
          await session.run(
            `MATCH (d:Developer {id: $devId})
             MATCH (p:Project {id: $projectId})
             MERGE (d)-[r:WORKED_ON]->(p)
             SET r.role = $role`,
            {
              devId: contributor.devId,
              projectId: proj.id,
              role: contributor.role
            }
          );
        }
      }
    }
    console.log(`Seeded ${projects.length} Project nodes, tech stacks, and team members.`);

    console.log('Database seeding successfully completed!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

runSeed();
