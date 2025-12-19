from crewai import Agent, Task, Crew, LLM
from crewai_tools import SerperDevTool
import os


def find_news():
    llm = LLM(model="openai/gpt-4.1-nano", max_completion_tokens=3000, temperature=0.25)

    search_tool = SerperDevTool()

    news_agent = Agent(
        role="Researcher specialising in Alzheimer's disease news",
        goal="Find recent and relevant ground-breaking news relating to Alzheimer's disease. Only collect REAL news.",
        backstory="You are an Alzheimer's disease researcher with a history of CLEARLY and CORRECTLY summarising news",
        tools=[search_tool],
        llm=llm
    )

    task = Task(
        description=( "Use the SerperDevTool to search for RECENT and FACTUAL Alzheimer's disease news. Use it to make "
                      "the following search queries:\n\n" 
                      " 1. Breaking Alzheimer's disease news\n" 
                      " 2. New Alzheimer's disease breakthroughs\n" 
                      " 3. New Alzheimer's disease treatments\n\n" 
                      "Return a summary of all the news you found, formatting it into SEPARATE readable paragraphs "
                      "detailing only REAL and possibly RELEVANT news related to Alzheimer's disease. Each paragraph "
                      "should cover a different topic. Use \\n\\n to clearly separate paragraphs. Do NOT merge all the "
                      "content into a single paragraph." ),
        expected_output="A summary of REAL Alzheimer's news articles taken directly from Serper search results.",
        agent=news_agent,
        used_tools=0
    )

    crew = Crew(
        agents=[news_agent],
        tasks=[task]
    )

    news_output = crew.kickoff()

    base_directory = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_directory, "weekly_summary.txt")  # Ensures weekly_summary.txt is written to same dir
    
    with open(file_path, "w", encoding="UTF-8") as output:
        output.write(news_output.raw)


if __name__ == "__main__":
    find_news()
