import React from 'react';
import { useStaticQuery, graphql, Link } from 'gatsby'
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPython } from '@fortawesome/free-brands-svg-icons'


import PageHeader from 'src/components/common/PageHeader';


import IFrame from 'src/components/common/IFrame';
import Button, { IconButton } from 'src/components/common/Button';

import ProjectTemplate from './ProjectTemplate';
import { ProjectLinks, ProjectPreview, Tags } from './ProjectTemplate.style';

const ProjectsWrapper = styled.section`
  ${props => props.theme.spacing.sectionBottom};
`
const Projects = () => {
  const projects = useStaticQuery(
    graphql`
      query {
        allMarkdownRemark(
          filter: {fields: {posttype: {eq: "case-studies"}}},
          sort: {fields: fields___fileIndex, order: ASC}) {
          edges {
            node {
              id
              frontmatter {
                demo
                excerpt
                iframe
                src
                title
                badgeUrl
              }
              fields {
                slug
              }
            }
          }
        }
      }
    `
  )

  return (
    <ProjectsWrapper id="projects" style={{ marginBottom: 100 }}>
      <PageHeader>Side Projects</PageHeader>

      {
        projects.allMarkdownRemark.edges.map(({ node }) => (
          <ProjectTemplate 
            key={node.id}
            title={node.frontmatter.title}
            desc={node.frontmatter.excerpt}
            links={
              <ProjectLinks>
                <Button as={Link} to={node.fields.slug}>Learn more</Button>
                <Button target="__blank" as="a" href={node.frontmatter.demo}>Live Demo</Button>
                <IconButton label="github" icon={["fab", "github"]} href={node.frontmatter.src} />
                <iframe src={node.frontmatter.badgeUrl} frameborder="0" scrolling="0" width="170px" height="20px"></iframe>                        
              </ProjectLinks>
            }
            preview={
              <ProjectPreview>
                <IFrame livedemo={!!node.frontmatter.iframe.match('codepen')} src={node.frontmatter.iframe} />
                <Tags>
                  <FontAwesomeIcon icon={faPython} />
                  {/* <FontAwesomeIcon icon={["fab", "html5"]} />
                  <FontAwesomeIcon icon={["fab", "css3"]} /> */}
                </Tags>
              </ProjectPreview>
            }
          />
        ))
      }

    </ProjectsWrapper>
  )
}

export default Projects;